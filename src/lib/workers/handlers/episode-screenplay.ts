import { createHash } from 'node:crypto'
import type { Job } from 'bullmq'

import { executeAiTextStep } from '@/lib/ai-runtime'
import { resolveProjectModelCapabilityGenerationOptions } from '@/lib/config-service'
import { getPromptTemplate, PROMPT_IDS } from '@/lib/prompt-i18n'
import { prisma } from '@/lib/prisma'
import { createArtifact } from '@/lib/run-runtime/service'
import { assertWorkflowRunActive, withWorkflowRunLease } from '@/lib/run-runtime/workflow-lease'
import type { TaskJobData } from '@/lib/task/types'
import { reportTaskProgress } from '@/lib/workers/shared'
import {
  runEpisodeScreenplayOrchestrator,
  type EpisodeScreenplayStepMeta,
} from '@/lib/novel-promotion/story-to-script/episode-orchestrator'
import { toScreenplaySource } from '@/lib/novel-promotion/screenplay/source'

import { parseEffort, parseTemperature } from './story-to-script-helpers'
import { resolveAnalysisModel } from './resolve-analysis-model'
import { resolveWorkflowRunId } from './workflow-run-id'

type Payload = Record<string, unknown>

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function assetKind(value: Record<string, unknown>): string {
  return typeof value.assetKind === 'string' ? value.assetKind : 'location'
}

function workerId(job: Job<TaskJobData>) {
  return `episode_screenplay:${job.queueName}:${job.data.taskId}`
}

export async function handleEpisodeScreenplayTask(job: Job<TaskJobData>) {
  const payload = (job.data.payload || {}) as Payload
  const episodeId = asString(payload.episodeId || job.data.episodeId).trim()
  if (!episodeId) throw new Error('episodeId is required')
  if (asString(payload.retryStepKey).trim()) {
    throw new Error('scene-level retry is not supported; rerun the complete episode screenplay')
  }

  const project = await prisma.project.findUnique({ where: { id: job.data.projectId }, select: { id: true, name: true } })
  if (!project) throw new Error('Project not found')
  const novelData = await prisma.novelPromotionProject.findUnique({
    where: { projectId: job.data.projectId }, include: { characters: true, locations: true },
  })
  if (!novelData) throw new Error('Novel promotion data not found')
  const episode = await prisma.novelPromotionEpisode.findUnique({
    where: { id: episodeId }, select: { id: true, novelPromotionProjectId: true, novelText: true },
  })
  if (!episode || episode.novelPromotionProjectId !== novelData.id) throw new Error('Episode not found')
  const content = toScreenplaySource(asString(payload.content).trim() || episode.novelText || '')
  if (!content) throw new Error('content is required')

  const model = await resolveAnalysisModel({
    userId: job.data.userId,
    inputModel: asString(payload.model).trim(),
    projectAnalysisModel: novelData.analysisModel,
  })
  const capabilities = await resolveProjectModelCapabilityGenerationOptions({
    projectId: job.data.projectId, userId: job.data.userId, modelType: 'llm', modelKey: model,
  })
  const runId = await resolveWorkflowRunId({
    payload,
    taskId: job.data.taskId,
    findRunIdByTaskId: async (taskId) => (await prisma.graphRun.findUnique({ where: { taskId }, select: { id: true } }))?.id || null,
  })
  if (!runId) throw new Error('runId is required for story_to_script pipeline')
  const activeWorkerId = workerId(job)
  const assertActive = async (stage: string) => await assertWorkflowRunActive({ runId, workerId: activeWorkerId, stage })
  const temperature = parseTemperature(payload.temperature)
  const requestedEffort = parseEffort(payload.reasoningEffort)
  const reasoning = payload.reasoning !== false
  const configuredEffort = capabilities.reasoningEffort
  const reasoningEffort = requestedEffort
    || (configuredEffort === 'minimal' || configuredEffort === 'low' || configuredEffort === 'medium' || configuredEffort === 'high'
      ? configuredEffort
      : 'high')

  const runStep = async (meta: EpisodeScreenplayStepMeta, prompt: string, action: string, _maxOutputTokens: number) => {
    void _maxOutputTokens
    await assertActive(`episode_screenplay:${meta.stepId}`)
    await reportTaskProgress(job, 15 + Math.floor((meta.stepIndex / Math.max(meta.stepTotal, 1)) * 60), {
      stage: 'episode_screenplay_step', stageLabel: 'progress.stage.storyToScriptStep', displayMode: 'detail',
      message: meta.stepTitle, stepId: meta.stepId, stepTitle: meta.stepTitle,
      stepIndex: meta.stepIndex, stepTotal: meta.stepTotal, dependsOn: meta.dependsOn || [], retryable: true,
    })
    const output = await executeAiTextStep({
      userId: job.data.userId, model, messages: [{ role: 'user', content: prompt }], projectId: job.data.projectId,
      action, meta, temperature, reasoning, reasoningEffort,
    })
    return { text: output.text, reasoning: output.reasoning }
  }

  const leaseResult = await withWorkflowRunLease({
    runId, userId: job.data.userId, workerId: activeWorkerId,
    run: async () => {
      await reportTaskProgress(job, 10, { stage: 'episode_screenplay_prepare', stageLabel: 'progress.stage.storyToScriptPrepare', displayMode: 'detail' })
      const result = await runEpisodeScreenplayOrchestrator({
        content: content.slice(0, 30_000),
        baseCharacters: novelData.characters.map((item) => item.name),
        baseLocations: novelData.locations.filter((item) => assetKind(item as unknown as Record<string, unknown>) !== 'prop').map((item) => item.name),
        baseProps: novelData.locations.filter((item) => assetKind(item as unknown as Record<string, unknown>) === 'prop').map((item) => item.name),
        baseCharacterIntroductions: novelData.characters.map((item) => ({ name: item.name, introduction: item.introduction })),
        promptTemplates: {
          characterPromptTemplate: getPromptTemplate(PROMPT_IDS.NP_AGENT_CHARACTER_PROFILE, job.data.locale),
          locationPromptTemplate: getPromptTemplate(PROMPT_IDS.NP_SELECT_LOCATION, job.data.locale),
          propPromptTemplate: getPromptTemplate(PROMPT_IDS.NP_SELECT_PROP, job.data.locale),
          scenePlanPromptTemplate: getPromptTemplate(PROMPT_IDS.NP_EPISODE_SCREENPLAY_PLAN, job.data.locale),
          sceneScreenplayPromptTemplate: getPromptTemplate(PROMPT_IDS.NP_EPISODE_SCENE_SCREENPLAY, job.data.locale),
        },
        runStep,
      })
      await assertActive('episode_screenplay_persist')
      const screenplayJson = JSON.stringify(result.screenplay)
      const sourceFingerprint = createHash('sha256').update(content).digest('hex')
      await prisma.$transaction(async (tx) => {
        await tx.novelPromotionScreenplay.upsert({
          where: { episodeId },
          create: {
            episodeId, title: result.screenplay.title, sourceFingerprint, rawJson: screenplayJson,
            scenes: { create: result.screenplay.scenes.map((scene) => ({ ...scene, heading: JSON.stringify(scene.heading), content: JSON.stringify(scene.content) })) },
          },
          update: {
            title: result.screenplay.title, sourceFingerprint, rawJson: screenplayJson,
            scenes: {
              deleteMany: {},
              create: result.screenplay.scenes.map((scene) => ({ ...scene, heading: JSON.stringify(scene.heading), content: JSON.stringify(scene.content) })),
            },
          },
        })
      })
      await createArtifact({ runId, stepKey: 'episode_screenplay', artifactType: 'screenplay.episode', refId: episodeId, payload: { title: result.screenplay.title, sceneCount: result.screenplay.scenes.length, screenplay: result.screenplay } })
      await reportTaskProgress(job, 96, { stage: 'episode_screenplay_done', stageLabel: 'progress.stage.storyToScriptPersistDone', displayMode: 'detail' })
      return { episodeId, sceneCount: result.screenplay.scenes.length, title: result.screenplay.title }
    },
  })
  return leaseResult.claimed && leaseResult.result ? leaseResult.result : { runId, skipped: true, episodeId }
}
