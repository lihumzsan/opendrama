import { describe, expect, it } from 'vitest'
import type { Clip, Storyboard, VideoPanel } from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/video'
import {
  buildVideoPanelGroups,
  selectFailedVideoPanels,
  selectPendingVideoPanels,
} from '@/lib/novel-promotion/stages/video-stage-runtime/video-panel-groups'

const clips: Clip[] = [
  { id: 'clip-1', start: 0, end: 4, summary: '初入山门' },
  { id: 'clip-2', start: 5, end: 9, summary: '夜访密室' },
]

const storyboards: Storyboard[] = [
  { id: 'storyboard-1', clipId: 'clip-1' },
  { id: 'storyboard-2', clipId: 'clip-2' },
]

const panels: VideoPanel[] = [
  { storyboardId: 'storyboard-1', panelIndex: 0, videoUrl: '/videos/1.mp4', videoTaskPhase: 'completed' },
  { storyboardId: 'storyboard-1', panelIndex: 1, videoTaskPhase: 'processing', videoTaskRunning: true },
  { storyboardId: 'storyboard-2', panelIndex: 0, videoTaskPhase: 'failed', videoErrorCode: 'UPSTREAM_ERROR' },
  { storyboardId: 'storyboard-2', panelIndex: 1, videoTaskPhase: 'idle' },
]

describe('video panel groups', () => {
  it('preserves storyboard order and reports each segment video state', () => {
    expect(buildVideoPanelGroups(storyboards, clips, panels)).toEqual([
      {
        storyboardId: 'storyboard-1',
        clipId: 'clip-1',
        index: 0,
        summary: '初入山门',
        panels: panels.slice(0, 2),
        stats: { total: 2, completed: 1, running: 1, failed: 0, pending: 0 },
      },
      {
        storyboardId: 'storyboard-2',
        clipId: 'clip-2',
        index: 1,
        summary: '夜访密室',
        panels: panels.slice(2, 4),
        stats: { total: 2, completed: 0, running: 0, failed: 1, pending: 1 },
      },
    ])
  })

  it('selects only actionable pending and failed panels for segment actions', () => {
    expect(selectPendingVideoPanels(panels)).toEqual([panels[3]])
    expect(selectFailedVideoPanels(panels)).toEqual([panels[2]])
  })
})
