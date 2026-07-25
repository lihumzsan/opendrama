import type {
  Clip,
  Storyboard,
  VideoPanel,
} from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/video'

export interface VideoPanelGroupStats {
  total: number
  completed: number
  running: number
  failed: number
  pending: number
}

export interface VideoPanelGroup {
  storyboardId: string
  clipId: string | null
  index: number
  summary: string
  panels: VideoPanel[]
  stats: VideoPanelGroupStats
}

function isVideoPanelRunning(panel: VideoPanel): boolean {
  return panel.videoTaskRunning === true
    || panel.videoTaskPhase === 'queued'
    || panel.videoTaskPhase === 'processing'
}

function isVideoPanelFailed(panel: VideoPanel): boolean {
  return panel.videoTaskPhase === 'failed'
    || (!panel.videoUrl && Boolean(panel.videoErrorCode || panel.videoErrorMessage))
}

export function selectPendingVideoPanels(panels: readonly VideoPanel[]): VideoPanel[] {
  return panels.filter((panel) => (
    !panel.videoUrl
    && !isVideoPanelRunning(panel)
    && !isVideoPanelFailed(panel)
  ))
}

export function selectFailedVideoPanels(panels: readonly VideoPanel[]): VideoPanel[] {
  return panels.filter((panel) => !panel.videoUrl && isVideoPanelFailed(panel))
}

export function getVideoPanelGroupStats(panels: readonly VideoPanel[]): VideoPanelGroupStats {
  const completed = panels.filter((panel) => Boolean(panel.videoUrl)).length
  const running = panels.filter(isVideoPanelRunning).length
  const failed = selectFailedVideoPanels(panels).length

  return {
    total: panels.length,
    completed,
    running,
    failed,
    pending: Math.max(0, panels.length - completed - running - failed),
  }
}

export function buildVideoPanelGroups(
  sortedStoryboards: readonly Storyboard[],
  clips: readonly Clip[],
  allPanels: readonly VideoPanel[],
): VideoPanelGroup[] {
  const panelsByStoryboardId = new Map<string, VideoPanel[]>()
  for (const panel of allPanels) {
    const groupPanels = panelsByStoryboardId.get(panel.storyboardId) || []
    groupPanels.push(panel)
    panelsByStoryboardId.set(panel.storyboardId, groupPanels)
  }

  const clipsById = new Map(clips.map((clip) => [clip.id, clip]))

  return sortedStoryboards.map((storyboard, index) => {
    const panels = panelsByStoryboardId.get(storyboard.id) || []
    const clipId = storyboard.clipId || null
    const clip = clipId ? clipsById.get(clipId) : undefined

    return {
      storyboardId: storyboard.id,
      clipId,
      index,
      summary: clip?.summary || storyboard.clip?.summary || '',
      panels,
      stats: getVideoPanelGroupStats(panels),
    }
  })
}
