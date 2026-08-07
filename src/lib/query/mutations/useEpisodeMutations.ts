import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Project } from '@/types/project'
import { resolveTaskResponse } from '@/lib/task/client'
import { queryKeys } from '../keys'
import { clearTaskTargetOverlay, upsertTaskTargetOverlay } from '../task-target-overlay'
import { TASK_TYPE } from '@/lib/task/types'
import type { CandidateEpisodePlan, ChapterBatchAnalysis } from '@/lib/novel-promotion/chapter-batch/types'
import {
  cancelEpisodeQueries,
  getEpisodeQueriesSnapshot,
  invalidateEpisodeQueries,
  restoreEpisodeQueriesSnapshot,
  setEpisodeQueriesData,
} from '../episode-cache'
import {
  invalidateQueryTemplates,
  requestBlobWithError,
  requestJsonWithError,
  requestTaskResponseWithError,
} from './mutation-shared'

export const EPISODE_SPLIT_TASK_TIMEOUT_MS = 21 * 60 * 1000

export const CHAPTER_BATCH_ANALYZE_TASK_TIMEOUT_MS = 21 * 60 * 1000

export type ChapterBatchResponse = {
  batch: {
    id: string
    title: string
    sourceText: string
    sourceFingerprint: string
    chapterStartLabel?: string | null
    chapterEndLabel?: string | null
    status: string
    analysisJson?: string | null
    candidateEpisodesJson?: string | null
    selectedPlanJson?: string | null
    createdEpisodeIdsJson?: string | null
    errorJson?: string | null
  }
}

export type ChapterBatchAnalyzeResult = ChapterBatchResponse & {
  analysis: ChapterBatchAnalysis | null
  candidatePlans: CandidateEpisodePlan[]
}

function parseJsonField<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

async function fetchChapterBatch(projectId: string, batchId: string) {
  return await requestJsonWithError<ChapterBatchResponse>(
    `/api/novel-promotion/${projectId}/chapter-batches/${batchId}`,
    { method: 'GET' },
    '获取章节批次失败',
  )
}

/**
 * 获取项目剧集列表
 */
export function useListProjectEpisodes(projectId: string) {
  return useMutation({
    mutationFn: async () =>
      await requestJsonWithError<{
        episodes?: Array<{
          episodeNumber?: number
          name?: string
          description?: string
          novelText?: string
        }>
      }>(`/api/novel-promotion/${projectId}/episodes`, { method: 'GET' }, '获取剧集失败'),
  })
}

/**
 * AI 智能分割剧集
 */
export function useSplitProjectEpisodes(projectId: string) {
  return useMutation({
    mutationFn: async (payload: { content: string; async?: boolean }) => {
      const response = await requestTaskResponseWithError(
        `/api/novel-promotion/${projectId}/episodes/split`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        '分割失败',
      )
      return resolveTaskResponse<{
        profile?: 'horizontal_motion_comic' | 'regular_episode'
        estimatedTotalMinutes?: number
        episodes: Array<{
          number: number
          title: string
          summary: string
          content: string
          wordCount: number
          estimatedMinutes?: number
          coreGoal?: string
          dramaticArc?: string
          endingHook?: string
          rationale?: string
          startSceneId?: string
          endSceneId?: string
          sceneIds?: string[]
          scenes?: Array<{
            id: string
            title: string
            summary: string
            content: string
            wordCount: number
            estimatedMinutes: number
          }>
        }>
      }>(response, {
        timeoutMs: EPISODE_SPLIT_TASK_TIMEOUT_MS,
      })
    },
  })
}

export function useCreateChapterBatch(projectId: string) {
  return useMutation({
    mutationFn: async (payload: {
      title: string
      sourceText: string
      chapterStartLabel?: string | null
      chapterEndLabel?: string | null
      replaceExisting?: boolean
    }) =>
      await requestJsonWithError<ChapterBatchResponse>(
        `/api/novel-promotion/${projectId}/chapter-batches`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        '保存章节批次失败',
      ),
  })
}

export function useAnalyzeChapterBatch(projectId: string) {
  return useMutation({
    mutationFn: async (payload: { batchId: string }) => {
      const response = await requestTaskResponseWithError(
        `/api/novel-promotion/${projectId}/chapter-batches/${payload.batchId}/analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        '章节分析失败',
      )
      await resolveTaskResponse<{
        batchId: string
        planCount: number
        episodeCount: number
      }>(response, {
        timeoutMs: CHAPTER_BATCH_ANALYZE_TASK_TIMEOUT_MS,
      })
      const batchResponse = await fetchChapterBatch(projectId, payload.batchId)
      return {
        ...batchResponse,
        analysis: parseJsonField<ChapterBatchAnalysis | null>(batchResponse.batch.analysisJson, null),
        candidatePlans: parseJsonField<CandidateEpisodePlan[]>(batchResponse.batch.candidateEpisodesJson, []),
      }
    },
  })
}

export function useConfirmChapterBatch(projectId: string) {
  return useMutation({
    mutationFn: async (payload: {
      batchId: string
      planId: string
      mode?: 'append' | 'update_current'
      episodeId?: string
      confirmOverwrite?: boolean
      episodes?: Array<{
        name: string
        description?: string
        novelText?: string
      }>
    }) =>
      await requestJsonWithError<{
        success: boolean
        idempotent?: boolean
        mode?: 'append' | 'update_current'
        episodes: Array<{ id: string; episodeNumber: number; name: string }>
      }>(
        `/api/novel-promotion/${projectId}/chapter-batches/${payload.batchId}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: payload.planId,
            mode: payload.mode || 'append',
            episodeId: payload.episodeId,
            confirmOverwrite: payload.confirmOverwrite,
            episodes: payload.episodes,
          }),
        },
        '确认章节批次失败',
      ),
  })
}

/**
 * 使用章节标记分割剧集
 */
export function useSplitProjectEpisodesByMarkers(projectId: string) {
  return useMutation({
    mutationFn: async (payload: { content: string }) =>
      await requestJsonWithError<{
        episodes?: Array<{
          number: number
          title: string
          summary: string
          content: string
          wordCount: number
        }>
      }>(
        `/api/novel-promotion/${projectId}/episodes/split-by-markers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        '分割失败',
      ),
  })
}

/**
 * 批量保存项目剧集
 */
export function useSaveProjectEpisodesBatch(projectId: string) {
  return useMutation({
    mutationFn: async (payload: {
      episodes: Array<{
        name: string
        description?: string
        novelText?: string
      }>
      mode?: 'append' | 'update_current' | 'replace_all'
      episodeId?: string
      confirmReplace?: boolean
      /** @deprecated Use mode='replace_all' with confirmReplace=true instead. */
      clearExisting?: boolean
      importStatus?: 'pending' | 'completed'
      triggerGlobalAnalysis?: boolean
    }) =>
      await requestJsonWithError(
        `/api/novel-promotion/${projectId}/episodes/batch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        '保存剧集失败',
      ),
  })
}

/**
 * 为单集生成一张独立封面图。任务入队后由统一任务状态与 SSE 驱动界面刷新。
 */
export function useGenerateEpisodeCover(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<{
    success?: boolean
    async?: boolean
    taskId?: string
  }, Error, { episodeId: string; hasOutput: boolean }>({
    mutationFn: async (variables) =>
      await requestJsonWithError<{
        success?: boolean
        async?: boolean
        taskId?: string
      }>(
        `/api/novel-promotion/${projectId}/episodes/${variables.episodeId}/cover`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        'Failed to generate episode cover',
      ),
    onMutate: async (variables) => {
      upsertTaskTargetOverlay(queryClient, {
        projectId,
        targetType: 'NovelPromotionEpisode',
        targetId: variables.episodeId,
        runningTaskType: TASK_TYPE.IMAGE_EPISODE_COVER,
        intent: variables.hasOutput ? 'regenerate' : 'generate',
        hasOutputAtStart: variables.hasOutput,
      })
    },
    onSuccess: (data, variables) => {
      upsertTaskTargetOverlay(queryClient, {
        projectId,
        targetType: 'NovelPromotionEpisode',
        targetId: variables.episodeId,
        runningTaskId: data.taskId || null,
        runningTaskType: TASK_TYPE.IMAGE_EPISODE_COVER,
        intent: variables.hasOutput ? 'regenerate' : 'generate',
        hasOutputAtStart: variables.hasOutput,
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.targetStatesAll(projectId),
        exact: false,
      })
    },
    onError: (_error, variables) => {
      clearTaskTargetOverlay(queryClient, {
        projectId,
        targetType: 'NovelPromotionEpisode',
        targetId: variables.episodeId,
      })
    },
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        invalidateEpisodeQueries(queryClient, projectId, variables.episodeId),
        queryClient.invalidateQueries({ queryKey: queryKeys.projectData(projectId) }),
      ])
    },
  })
}

/**
 * 更新剧集字段
 */
export function useUpdateProjectEpisodeField(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      episodeId,
      key,
      value,
    }: {
      episodeId: string
      key: string
      value: unknown
    }) =>
      await requestJsonWithError(
        `/api/novel-promotion/${projectId}/episodes/${episodeId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: value }),
        },
        'Failed to update episode',
      ),
    onMutate: async (variables) => {
      const projectQueryKey = queryKeys.projectData(projectId)

      await cancelEpisodeQueries(queryClient, projectId, variables.episodeId)
      await queryClient.cancelQueries({ queryKey: projectQueryKey })

      const previousEpisodes = getEpisodeQueriesSnapshot(queryClient, projectId, variables.episodeId)
      const previousProject = queryClient.getQueryData<Project>(projectQueryKey)

      setEpisodeQueriesData(queryClient, projectId, variables.episodeId, (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          [variables.key]: variables.value,
        }
      })

      queryClient.setQueryData<Project | undefined>(projectQueryKey, (prev) => {
        if (!prev?.novelPromotionData) return prev
        const episodes = Array.isArray(prev.novelPromotionData.episodes)
          ? prev.novelPromotionData.episodes.map((episode) =>
              episode.id === variables.episodeId ? { ...episode, [variables.key]: variables.value } : episode,
            )
          : prev.novelPromotionData.episodes
        return {
          ...prev,
          novelPromotionData: {
            ...prev.novelPromotionData,
            episodes,
          },
        }
      })

      return { previousEpisodes, previousProject, episodeId: variables.episodeId }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEpisodes) {
        restoreEpisodeQueriesSnapshot(queryClient, context.previousEpisodes)
      }
      if (context?.previousProject) {
        queryClient.setQueryData(queryKeys.projectData(projectId), context.previousProject)
      }
    },
    onSettled: async (_, __, variables) => {
      await Promise.all([
        invalidateEpisodeQueries(queryClient, projectId, variables.episodeId),
        invalidateQueryTemplates(queryClient, [
          queryKeys.projectData(projectId),
        ]),
      ])
    },
  })
}

/**
 * 更新 clip 数据
 */
export function useUpdateProjectClip(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      clipId,
      data,
    }: {
      clipId: string
      data: Record<string, unknown>
      episodeId?: string
    }) =>
      await requestJsonWithError(
        `/api/novel-promotion/${projectId}/clips/${clipId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        'update failed',
      ),
    onMutate: async (variables) => {
      if (!variables.episodeId) return { previousEpisodes: null, episodeId: null }

      await cancelEpisodeQueries(queryClient, projectId, variables.episodeId)

      const previousEpisodes = getEpisodeQueriesSnapshot(queryClient, projectId, variables.episodeId)
      setEpisodeQueriesData(queryClient, projectId, variables.episodeId, (prev) => {
        if (!prev || typeof prev !== 'object') return prev
        const episode = prev as Record<string, unknown>
        const clips = Array.isArray(episode.clips) ? episode.clips : []
        return {
          ...episode,
          clips: clips.map((clip: Record<string, unknown>) =>
            clip?.id === variables.clipId ? { ...clip, ...variables.data } : clip,
          ),
        }
      })

      return { previousEpisodes, episodeId: variables.episodeId }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEpisodes) {
        restoreEpisodeQueriesSnapshot(queryClient, context.previousEpisodes)
      }
    },
    onSettled: async (_data, _error, variables) => {
      await invalidateQueryTemplates(queryClient, [queryKeys.projectData(projectId)])
      if (variables.episodeId) {
        await invalidateEpisodeQueries(queryClient, projectId, variables.episodeId)
      }
    },
  })
}

/**
 * 下载远程文件 blob（避免组件层直接 fetch）
 */
export function useDownloadRemoteBlob() {
  return useMutation({
    mutationFn: async (url: string) =>
      await requestBlobWithError(
        url,
        { method: 'GET' },
        '下载失败',
      ),
  })
}
