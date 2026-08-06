'use client'

import { useEpisodeData } from '@/lib/query/hooks'
import type { EpisodeDataProfile } from '@/lib/novel-promotion/episode-data-profile'
import type { NovelPromotionClip, NovelPromotionStoryboard } from '@/types/project'
import { useWorkspaceProvider } from '../WorkspaceProvider'

interface EpisodeStagePayload {
  name?: string
  coverImageMediaId?: string | null
  coverImageUrl?: string | null
  novelText?: string | null
  clips?: NovelPromotionClip[]
  screenplay?: {
    id: string
    title: string
    rawJson: string
    scenes?: Array<{
      id: string
      sceneNumber: number
      heading: string
      entryState: string
      goal: string
      conflict: string
      outcome: string
      exitState: string
      content: string
    }>
  } | null
  storyboards?: NovelPromotionStoryboard[]
}

export function useWorkspaceEpisodeStageData(profile: EpisodeDataProfile) {
  const { projectId, episodeId } = useWorkspaceProvider()
  const { data: episodeData } = useEpisodeData(projectId, episodeId || null, { profile })
  const payload = episodeData as EpisodeStagePayload | null

  return {
    episodeName: payload?.name,
    coverImageMediaId: payload?.coverImageMediaId || null,
    coverImageUrl: payload?.coverImageUrl || null,
    novelText: payload?.novelText || '',
    clips: payload?.clips || [],
    screenplay: payload?.screenplay || null,
    storyboards: payload?.storyboards || [],
  }
}
