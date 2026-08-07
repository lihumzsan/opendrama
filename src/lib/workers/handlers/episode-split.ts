import type { Job } from 'bullmq'
import { safeParseJsonObject } from '@/lib/json-repair'
import { prisma } from '@/lib/prisma'
import { executeAiTextStep } from '@/lib/ai-runtime'
import { withInternalLLMStreamCallbacks } from '@/lib/llm-observe/internal-stream-context'
import { reportTaskProgress } from '@/lib/workers/shared'
import { assertTaskActive } from '@/lib/workers/utils'
import { getUserModelConfig } from '@/lib/config-service'
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
import { createWorkerLLMStreamCallbacks, createWorkerLLMStreamContext } from './llm-stream'
import type { TaskJobData } from '@/lib/task/types'
import { buildPrompt, PROMPT_IDS } from '@/lib/prompt-i18n'

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
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}...`
}

function buildExistingEpisodeContext(episodes: ExistingEpisodeForContext[]) {
  if (episodes.length === 0) return '无已有剧集，从第1集开始。'
  const recentEpisodes = episodes.slice(-8)
  const lines = recentEpisodes.map((episode) => {
    const title = compactText(episode.name, 40)
    const summary = compactText(episode.description || episode.novelText, 120)
    return `- #${episode.episodeNumber} ${title}${summary ? `: ${summary}` : ''}`
  })
  return `已有 ${episodes.length} 集；已有剧集仅用于延续节奏、角色和设定。本次场景卡是必须完整覆盖的素材，即使与已有剧集内容相似也不得跳过任何场景。\n${lines.join('\n')}`
}

function serializeUnits(units: ReturnType<typeof buildEpisodeSourceUnits>) {
  return JSON.stringify(
    units.map((unit) => ({
      unitId: unit.id,
      kind: unit.kind,
      title: unit.title,
      wordCount: unit.wordCount,
      text: unit.text,
    })),
  )
}

function serializeSceneCards(scenes: NarrativeScene[]) {
  return JSON.stringify(
    scenes.map((scene) => ({
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
    })),
  )
}

function parseSceneAnalysis(responseText: string, batchId: string) {
  const parsed = asRecord(safeParseJsonObject(responseText))
  if (!Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error(`场景分析结果无效（${batchId}）`)
  }
  return parsed.scenes
}

async function runSemanticTextStep(params: {
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
        action: 'episode_split',
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

export async function handleEpisodeSplitTask(job: Job<TaskJobData>) {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const projectId = job.data.projectId
  const content = typeof payload.content === 'string' ? payload.content : ''
  if (!content || content.length < 100) {
    throw new Error('文本太短，至少需要 100 字')
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  })
  if (!project) throw new Error('Project not found')

  const novelProject = await prisma.novelPromotionProject.findFirst({
    where: { projectId },
    select: { id: true },
  })
  if (!novelProject) throw new Error('Novel promotion data not found')

  const existingEpisodes = await prisma.novelPromotionEpisode.findMany({
    where: { novelPromotionProjectId: novelProject.id },
    orderBy: { episodeNumber: 'asc' },
    select: {
      episodeNumber: true,
      name: true,
      description: true,
      novelText: true,
    },
  })

  const userConfig = await getUserModelConfig(job.data.userId)
  const analysisModel = userConfig.analysisModel
  if (!analysisModel) throw new Error('请先在设置页面配置分析模型')

  await reportTaskProgress(job, 10, {
    stage: 'episode_split_source_parse',
    stageLabel: '识别原文场景与章节',
    displayMode: 'detail',
  })
  await assertTaskActive(job, 'episode_split_source_parse')

  const sourceKind = classifyEpisodeSource(content)
  const units = buildEpisodeSourceUnits(content)
  const batches = buildEpisodeAnalysisBatches(units)
  const streamContext = createWorkerLLMStreamContext(job, 'episode_split')
  const streamCallbacks = createWorkerLLMStreamCallbacks(job, streamContext)
  const rawScenes: unknown[] = []
  const stepTotal = batches.length + 1

  try {
    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index]
      const progress = 20 + Math.round(((index + 1) / Math.max(1, batches.length)) * 35)
      await reportTaskProgress(job, progress, {
        stage: 'episode_split_scene_analysis',
        stageLabel: `分析剧情场景（${index + 1}/${batches.length}）`,
        displayMode: 'detail',
      })
      await assertTaskActive(job, `episode_split_scene_analysis:${batch.id}`)
      const prompt = buildPrompt({
        promptId: PROMPT_IDS.NP_EPISODE_SCENE_ANALYSIS,
        locale: job.data.locale,
        variables: {
          SOURCE_KIND: sourceKind,
          BATCH_ID: batch.id,
          UNIT_JSON: serializeUnits(batch.units),
        },
      })
      const completion = await runSemanticTextStep({
        job,
        callbacks: streamCallbacks,
        model: analysisModel,
        prompt,
        stepId: `episode_scene_analysis_${batch.id}`,
        stepTitle: `剧情场景分析 ${index + 1}/${batches.length}`,
        stepIndex: index + 1,
        stepTotal,
      })
      if (!completion.text) throw new Error(`AI 场景分析返回为空（${batch.id}）`)
      rawScenes.push(...parseSceneAnalysis(completion.text, batch.id))
    }

    const scenes = normalizeNarrativeScenes(units, rawScenes)
    await reportTaskProgress(job, 70, {
      stage: 'episode_split_global_plan',
      stageLabel: '规划剧集结构与结尾钩子',
      displayMode: 'detail',
    })

    let lastValidationError: Error | null = null
    let previousPlan: unknown = null
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await assertTaskActive(job, `episode_split_global_plan:${attempt}`)
      const repairContext = attempt === 1
        ? '无'
        : `上一方案校验失败：${lastValidationError?.message || '未知错误'}\n上一方案：${JSON.stringify(previousPlan)}`
      const prompt = buildPrompt({
        promptId: PROMPT_IDS.NP_EPISODE_PLAN,
        locale: job.data.locale,
        variables: {
          SOURCE_KIND: sourceKind,
          ESTIMATED_TOTAL_MINUTES: String(estimateEpisodeRuntimeMinutes(content)),
          EXISTING_EPISODE_CONTEXT: buildExistingEpisodeContext(existingEpisodes),
          SCENE_JSON: serializeSceneCards(scenes),
          REPAIR_CONTEXT: repairContext,
        },
      })
      const completion = await runSemanticTextStep({
        job,
        callbacks: streamCallbacks,
        model: analysisModel,
        prompt,
        stepId: 'episode_global_plan',
        stepTitle: attempt === 1 ? '智能剧集规划' : '修复剧集规划',
        stepIndex: stepTotal,
        stepTotal,
        stepAttempt: attempt,
      })
      if (!completion.text) throw new Error('AI 剧集规划返回为空')
      const parsedPlan = safeParseJsonObject(completion.text)
      previousPlan = parsedPlan

      let result: ReturnType<typeof assembleSemanticEpisodes>
      try {
        result = assembleSemanticEpisodes(content, scenes, parsedPlan)
      } catch (error) {
        lastValidationError = error instanceof Error ? error : new Error(String(error))
        if (attempt === 1) {
          await reportTaskProgress(job, 84, {
            stage: 'episode_split_plan_repair',
            stageLabel: `修复分集边界：${lastValidationError.message}`,
            displayMode: 'detail',
          })
          continue
        }
        if (!lastValidationError.message.startsWith('scene coverage gap')) throw lastValidationError
        result = assembleSemanticEpisodes(
          content,
          scenes,
          repairSemanticEpisodePlanCoverage(scenes, parsedPlan),
        )
      }

      try {
        const nextEpisodeNumber = (existingEpisodes.at(-1)?.episodeNumber || 0) + 1
        const episodes = result.episodes.map((episode, index) => ({
          ...episode,
          number: nextEpisodeNumber + index,
        }))
        await reportTaskProgress(job, 96, {
          stage: 'episode_split_done',
          stageLabel: '语义分集完成',
          displayMode: 'detail',
        })
        return {
          ...result,
          episodes,
        }
      } catch (error) {
        lastValidationError = error instanceof Error ? error : new Error(String(error))
        if (attempt === 2) throw lastValidationError
        await reportTaskProgress(job, 84, {
          stage: 'episode_split_plan_repair',
          stageLabel: `修复分集边界：${lastValidationError.message}`,
          displayMode: 'detail',
        })
      }
    }
    throw lastValidationError || new Error('语义分集规划失败')
  } finally {
    await streamCallbacks.flush()
  }
}
