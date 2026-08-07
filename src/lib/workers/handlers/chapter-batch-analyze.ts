import type { Job } from 'bullmq'

import { executeAiTextStep } from '@/lib/ai-runtime'
import { getUserModelConfig } from '@/lib/config-service'
import { safeParseJsonObject } from '@/lib/json-repair'
import { validateCandidateEpisodePlans } from '@/lib/novel-promotion/chapter-batch/validation'
import type { CandidateEpisodePlan, ChapterBatchAnalysis } from '@/lib/novel-promotion/chapter-batch/types'
import {
  assembleSemanticEpisodes,
  buildEpisodeAnalysisBatches,
  buildEpisodeSourceUnits,
  classifyEpisodeSource,
  estimateEpisodeRuntimeMinutes,
  normalizeNarrativeScenes,
  repairSemanticEpisodePlanCoverage,
  type NarrativeScene,
} from '@/lib/novel-promotion/semantic-episode-split'
import { buildPrompt, PROMPT_IDS } from '@/lib/prompt-i18n'
import { prisma } from '@/lib/prisma'
import type { TaskJobData } from '@/lib/task/types'
import { withInternalLLMStreamCallbacks } from '@/lib/llm-observe/internal-stream-context'
import { reportTaskProgress } from '@/lib/workers/shared'
import { assertTaskActive } from '@/lib/workers/utils'

import { createWorkerLLMStreamCallbacks, createWorkerLLMStreamContext } from './llm-stream'

type ExistingEpisodeForContext = {
  episodeNumber: number
  name: string
  description: string | null
  novelText: string | null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function compactText(value: string | null | undefined, maxLength: number) {
  const normalized = (value || '').replace(/\s+/g, ' ').trim()
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}...`
}

function buildExistingEpisodeContext(episodes: ExistingEpisodeForContext[]) {
  if (episodes.length === 0) return '无已有剧集，从第1集开始。'
  return [
    `已有 ${episodes.length} 集；已有剧集仅用于延续角色与设定。本次场景卡是必须完整覆盖的素材，即使与已有剧集内容相似也不得跳过任何场景。`,
    ...episodes.slice(-8).map((episode) => {
      const summary = compactText(episode.description || episode.novelText, 120)
      return `- #${episode.episodeNumber} ${compactText(episode.name, 40)}${summary ? `: ${summary}` : ''}`
    }),
  ].join('\n')
}

function serializeUnits(units: ReturnType<typeof buildEpisodeSourceUnits>) {
  return JSON.stringify(units.map((unit) => ({
    unitId: unit.id,
    kind: unit.kind,
    title: unit.title,
    wordCount: unit.wordCount,
    text: unit.text,
  })))
}

function serializeSceneCards(scenes: NarrativeScene[]) {
  return JSON.stringify(scenes.map((scene) => ({
    sceneId: scene.id,
    title: scene.title,
    summary: scene.summary,
    characters: scene.characters,
    location: scene.location,
    time: scene.time,
    goal: scene.goal,
    conflict: scene.conflict,
    outcome: scene.outcome,
    plotline: scene.plotline,
    unresolvedThreads: scene.unresolvedThreads,
    turningPoint: scene.turningPoint,
    boundaryAfter: scene.boundaryAfter,
    estimatedMinutes: scene.estimatedMinutes,
  })))
}

function parseSceneAnalysis(responseText: string, batchId: string) {
  const parsed = asRecord(safeParseJsonObject(responseText))
  if (!Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error(`章节场景分析结果无效（${batchId}）`)
  }
  return parsed.scenes
}

function buildChapterAnalysis(scenes: NarrativeScene[]): ChapterBatchAnalysis {
  return {
    summary: scenes.map((scene) => scene.summary).filter(Boolean).join('；'),
    characterChanges: [...new Set(scenes.flatMap((scene) => scene.characters))],
    locations: [...new Set(scenes.map((scene) => scene.location).filter(Boolean))],
    props: [],
    plotlines: [...new Set(scenes.map((scene) => scene.plotline).filter(Boolean))],
    unresolvedThreads: [...new Set(scenes.flatMap((scene) => scene.unresolvedThreads))],
    inferred: [],
  }
}

function buildCandidatePlans(sourceText: string, splitResult: ReturnType<typeof assembleSemanticEpisodes>): CandidateEpisodePlan[] {
  const episodes = splitResult.episodes.map((episode) => {
    const firstScene = episode.scenes[0]
    const lastScene = episode.scenes[episode.scenes.length - 1]
    if (!firstScene || !lastScene) {
      throw new Error(`episode ${episode.number} scenes are required`)
    }
    return {
      provisionalNumber: episode.number,
      name: episode.title,
      description: episode.summary,
      sourceStart: firstScene.startIndex,
      sourceEnd: lastScene.endIndex,
      sourceText: sourceText.slice(firstScene.startIndex, lastScene.endIndex),
      coreGoal: episode.coreGoal,
      dramaticArc: episode.dramaticArc,
      endingHook: episode.endingHook,
      adaptationNotes: {
        keep: episode.scenes.map((scene) => scene.title).filter(Boolean),
        merge: episode.scenes.length > 1 ? [`合并 ${episode.scenes.length} 个叙事场景为本集`] : [],
        remove: [],
        externalize: [],
        inferred: [episode.rationale].filter(Boolean),
      },
    }
  })

  return validateCandidateEpisodePlans(sourceText, [{
    planId: `semantic-${episodes.length}-episode`,
    title: episodes.length === 1 ? '一集版' : `${episodes.length} 集版`,
    rationale: splitResult.episodes.map((episode) => episode.rationale).filter(Boolean).join('；'),
    episodes,
  }])
}

function isSceneCoverageGap(error: Error) {
  return error.message.startsWith('scene coverage gap')
}

async function runTextStep(params: {
  job: Job<TaskJobData>
  callbacks: ReturnType<typeof createWorkerLLMStreamCallbacks>
  model: string
  prompt: string
  stepId: string
  stepTitle: string
  stepIndex: number
  stepTotal: number
  stepAttempt?: number
}) {
  return await withInternalLLMStreamCallbacks(
    params.callbacks,
    async () =>
      await executeAiTextStep({
        userId: params.job.data.userId,
        model: params.model,
        messages: [{ role: 'user', content: params.prompt }],
        temperature: 0.2,
        reasoning: true,
        reasoningEffort: 'medium',
        projectId: params.job.data.projectId,
        action: 'chapter_batch_analyze',
        meta: {
          stepId: params.stepId,
          stepAttempt: params.stepAttempt ?? 1,
          stepTitle: params.stepTitle,
          stepIndex: params.stepIndex,
          stepTotal: params.stepTotal,
        },
      }),
  )
}

export async function handleChapterBatchAnalyzeTask(job: Job<TaskJobData>) {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const batchId = typeof payload.batchId === 'string' && payload.batchId.trim()
    ? payload.batchId.trim()
    : job.data.targetId
  if (!batchId) throw new Error('batchId is required')

  const batch = await prisma.novelPromotionChapterBatch.findUnique({ where: { id: batchId } })
  if (!batch) throw new Error('Chapter batch not found')
  const novelProject = await prisma.novelPromotionProject.findUnique({
    where: { id: batch.novelPromotionProjectId },
    select: { id: true, projectId: true },
  })
  if (!novelProject || novelProject.projectId !== job.data.projectId) throw new Error('Novel promotion data not found')

  const content = batch.sourceText.replace(/\r\n/g, '\n').trim()
  if (content.length < 100) throw new Error('章节文本太短，至少需要 100 字')

  await prisma.novelPromotionChapterBatch.update({
    where: { id: batchId },
    data: { status: 'analyzing', errorJson: null },
  })

  try {
    const existingEpisodes = await prisma.novelPromotionEpisode.findMany({
      where: { novelPromotionProjectId: novelProject.id },
      orderBy: { episodeNumber: 'asc' },
      select: { episodeNumber: true, name: true, description: true, novelText: true },
    })
    const userConfig = await getUserModelConfig(job.data.userId)
    const model = userConfig.analysisModel
    if (!model) throw new Error('请先在设置页面配置分析模型')

    await reportTaskProgress(job, 10, {
      stage: 'chapter_batch_source_parse',
      stageLabel: '识别章节素材',
      displayMode: 'detail',
    })
    await assertTaskActive(job, 'chapter_batch_source_parse')

    const sourceKind = classifyEpisodeSource(content)
    const units = buildEpisodeSourceUnits(content)
    const batches = buildEpisodeAnalysisBatches(units)
    const streamContext = createWorkerLLMStreamContext(job, 'chapter_batch_analyze')
    const streamCallbacks = createWorkerLLMStreamCallbacks(job, streamContext)
    const rawScenes: unknown[] = []
    const stepTotal = batches.length + 1

    try {
      for (let index = 0; index < batches.length; index += 1) {
        const analysisBatch = batches[index]
        await assertTaskActive(job, `chapter_batch_scene_analysis:${analysisBatch.id}`)
        await reportTaskProgress(job, 20 + Math.round(((index + 1) / Math.max(1, batches.length)) * 35), {
          stage: 'chapter_batch_scene_analysis',
          stageLabel: `分析章节场景（${index + 1}/${batches.length}）`,
          displayMode: 'detail',
        })
        const prompt = buildPrompt({
          promptId: PROMPT_IDS.NP_EPISODE_SCENE_ANALYSIS,
          locale: job.data.locale,
          variables: {
            SOURCE_KIND: sourceKind,
            BATCH_ID: analysisBatch.id,
            UNIT_JSON: serializeUnits(analysisBatch.units),
          },
        })
        const completion = await runTextStep({
          job,
          callbacks: streamCallbacks,
          model,
          prompt,
          stepId: `chapter_batch_scene_analysis_${analysisBatch.id}`,
          stepTitle: `章节场景分析 ${index + 1}/${batches.length}`,
          stepIndex: index + 1,
          stepTotal,
        })
        if (!completion.text) throw new Error(`AI 章节场景分析返回为空（${analysisBatch.id}）`)
        rawScenes.push(...parseSceneAnalysis(completion.text, analysisBatch.id))
      }

      const scenes = normalizeNarrativeScenes(units, rawScenes)
      let lastValidationError: Error | null = null
      let previousPlan: unknown = null
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        await assertTaskActive(job, `chapter_batch_global_plan:${attempt}`)
        await reportTaskProgress(job, attempt === 1 ? 70 : 84, {
          stage: attempt === 1 ? 'chapter_batch_global_plan' : 'chapter_batch_plan_repair',
          stageLabel: attempt === 1 ? '规划候选剧集' : `修复候选剧集：${lastValidationError?.message || '未知错误'}`,
          displayMode: 'detail',
        })
        const prompt = buildPrompt({
          promptId: PROMPT_IDS.NP_EPISODE_PLAN,
          locale: job.data.locale,
          variables: {
            SOURCE_KIND: sourceKind,
            ESTIMATED_TOTAL_MINUTES: String(estimateEpisodeRuntimeMinutes(content)),
            EXISTING_EPISODE_CONTEXT: buildExistingEpisodeContext(existingEpisodes),
            SCENE_JSON: serializeSceneCards(scenes),
            REPAIR_CONTEXT: attempt === 1
              ? '无'
              : `上一方案校验失败：${lastValidationError?.message || '未知错误'}\n上一方案：${JSON.stringify(previousPlan)}`,
          },
        })
        const completion = await runTextStep({
          job,
          callbacks: streamCallbacks,
          model,
          prompt,
          stepId: 'chapter_batch_episode_plan',
          stepTitle: attempt === 1 ? '候选剧集规划' : '修复候选剧集规划',
          stepIndex: stepTotal,
          stepTotal,
          stepAttempt: attempt,
        })
        if (!completion.text) throw new Error('AI 候选剧集规划返回为空')
        previousPlan = safeParseJsonObject(completion.text)

        let splitResult: ReturnType<typeof assembleSemanticEpisodes>
        try {
          splitResult = assembleSemanticEpisodes(content, scenes, previousPlan)
        } catch (error) {
          lastValidationError = error instanceof Error ? error : new Error(String(error))
          if (attempt === 1) continue
          if (!isSceneCoverageGap(lastValidationError)) throw lastValidationError
          splitResult = assembleSemanticEpisodes(
            content,
            scenes,
            repairSemanticEpisodePlanCoverage(scenes, previousPlan),
          )
        }

        try {
          const candidatePlans = buildCandidatePlans(content, splitResult)
          const analysis = buildChapterAnalysis(scenes)
          await prisma.novelPromotionChapterBatch.update({
            where: { id: batchId },
            data: {
              status: 'analyzed',
              analysisJson: JSON.stringify(analysis),
              candidateEpisodesJson: JSON.stringify(candidatePlans),
              selectedPlanJson: null,
              createdEpisodeIdsJson: null,
              errorJson: null,
            },
          })
          await reportTaskProgress(job, 96, {
            stage: 'chapter_batch_done',
            stageLabel: '章节改编方案完成',
            displayMode: 'detail',
          })
          return {
            batchId,
            planCount: candidatePlans.length,
            episodeCount: candidatePlans.reduce((sum, plan) => sum + plan.episodes.length, 0),
          }
        } catch (error) {
          lastValidationError = error instanceof Error ? error : new Error(String(error))
          if (attempt === 2) throw lastValidationError
        }
      }
      throw new Error('候选剧集规划失败')
    } finally {
      await streamCallbacks.flush()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await prisma.novelPromotionChapterBatch.update({
      where: { id: batchId },
      data: {
        status: 'failed',
        errorJson: JSON.stringify({ message }),
      },
    })
    throw error
  }
}
