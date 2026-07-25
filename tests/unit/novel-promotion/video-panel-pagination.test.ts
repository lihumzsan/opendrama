import React, { type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import VideoRenderPanel from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/video-stage/VideoRenderPanel'
import type { VideoPanel } from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/video'
import {
  VIDEO_PANEL_PAGE_SIZE,
  getVideoPanelPage,
  paginateVideoPanels,
} from '@/lib/novel-promotion/stages/video-stage-runtime/video-panel-pagination'

vi.stubGlobal('React', React)

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (
    values ? `${key}:${JSON.stringify(values)}` : key
  ),
}))

vi.mock('@/lib/constants', () => ({
  getAspectRatioConfig: () => ({ isVertical: false }),
}))

vi.mock('@/lib/novel-promotion/stages/video-stage-runtime/first-last-frame-prompt-entry', () => ({
  resolvePanelFirstLastFrameGenerationOptions: () => ({}),
}))

vi.mock('@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/video', () => ({
  VideoPanelCard: ({ panel, panelIndex, prevPanel, nextPanel, hasNext, isLastFrame }: {
    panel: VideoPanel
    panelIndex: number
    prevPanel: VideoPanel | null
    nextPanel: VideoPanel | null
    hasNext: boolean
    isLastFrame: boolean
  }) => React.createElement('article', {
    'data-panel-key': `${panel.storyboardId}-${panel.panelIndex}`,
    'data-global-index': panelIndex,
    'data-prev-index': prevPanel?.panelIndex,
    'data-next-index': nextPanel?.panelIndex,
    'data-has-next': String(hasNext),
    'data-is-last-frame': String(isLastFrame),
  }),
}))

const panels = Array.from({ length: 60 }, (_, panelIndex) => ({
  storyboardId: 'story',
  panelIndex,
}))

describe('video panel pagination', () => {
  it('returns at most 24 panels for the requested page', () => {
    const page = paginateVideoPanels(panels, 1)

    expect(VIDEO_PANEL_PAGE_SIZE).toBe(24)
    expect(page.items).toHaveLength(24)
    expect(page.items[0]?.panelIndex).toBe(0)
    expect(page.items[23]?.panelIndex).toBe(23)
  })

  it('keeps the global start index for panel semantics', () => {
    const page = paginateVideoPanels(panels, 2)

    expect(page.startIndex).toBe(24)
    expect(page.items[0]?.panelIndex).toBe(24)
  })

  it('finds the page containing a panel key', () => {
    expect(getVideoPanelPage(panels, 'story-49')).toBe(3)
  })

  it('renders only expanded storyboard segments while keeping global neighbors', () => {
    const groupedPanels: VideoPanel[] = [
      { storyboardId: 'story-1', panelIndex: 0 },
      { storyboardId: 'story-1', panelIndex: 1 },
      { storyboardId: 'story-2', panelIndex: 0 },
    ]
    const getNextPanel = vi.fn((index: number) => groupedPanels[index + 1] || null)
    const props = {
      allPanels: groupedPanels,
      panelGroups: [
        {
          storyboardId: 'story-1',
          clipId: 'clip-1',
          index: 0,
          summary: '第一段剧情',
          panels: groupedPanels.slice(0, 2),
          stats: { total: 2, completed: 0, running: 0, failed: 0, pending: 2 },
        },
        {
          storyboardId: 'story-2',
          clipId: 'clip-2',
          index: 1,
          summary: '第二段剧情',
          panels: groupedPanels.slice(2),
          stats: { total: 1, completed: 0, running: 0, failed: 0, pending: 1 },
        },
      ],
      expandedStoryboardIds: new Set(['story-1']),
      onToggleStoryboard: vi.fn(),
      currentPage: 1,
      onPageChange: vi.fn(),
      linkedPanels: new Map(),
      highlightedPanelKey: null,
      panelRefs: { current: new Map() },
      videoRatio: '16:9',
      defaultVideoModel: 'model-default',
      capabilityOverrides: {},
      projectId: 'project-1',
      episodeId: 'episode-1',
      runningVoiceLineIds: new Set(),
      panelVoiceLines: new Map(),
      panelVideoPreference: new Map(),
      savingPrompts: new Set(),
      flModel: '',
      flModelOptions: [],
      flGenerationOptions: {},
      flGenerationOptionsByPanel: new Map(),
      flCapabilityFields: [],
      flMissingCapabilityFields: [],
      promptEntries: new Map(),
      onGenerateVideo: vi.fn(async () => undefined),
      onUpdatePanelVideoModel: vi.fn(),
      onUpdatePanelVideoDurationBinding: vi.fn(),
      onRestorePreviousVideo: vi.fn(),
      onLipSync: vi.fn(),
      onToggleLink: vi.fn(),
      onFlModelChange: vi.fn(),
      onFlCapabilityChange: vi.fn(),
      onRestoreFlSmartDuration: vi.fn(),
      onFlPromptChange: vi.fn(),
      onSaveFlPrompt: vi.fn(),
      onRegenerateFlPrompt: vi.fn(),
      onGenerateFirstLastFrame: vi.fn(),
      onPreviewImage: vi.fn(),
      onToggleLipSyncVideo: vi.fn(),
      getNextPanel,
      isLinkedAsLastFrame: vi.fn(() => false),
      getFirstLastFrameDurationStatus: () => null,
      getLocalPrompt: () => '',
      updateLocalPrompt: vi.fn(),
      savePrompt: vi.fn(),
    } as unknown as ComponentProps<typeof VideoRenderPanel>

    const markup = renderToStaticMarkup(React.createElement(VideoRenderPanel, props))

    expect(markup).toContain('第一段剧情')
    expect(markup).toContain('data-panel-key="story-1-0"')
    expect(markup).toContain('data-panel-key="story-1-1"')
    expect(markup).not.toContain('data-panel-key="story-2-0"')
    expect(getNextPanel).toHaveBeenCalledWith(1)
  })

  it('disables segment actions while a global batch submission is running', () => {
    const segmentPanel: VideoPanel = { storyboardId: 'story-1', panelIndex: 0 }
    const props = {
      allPanels: [segmentPanel],
      panelGroups: [{
        storyboardId: 'story-1',
        clipId: 'clip-1',
        index: 0,
        summary: '第一段剧情',
        panels: [segmentPanel],
        stats: { total: 1, completed: 0, running: 0, failed: 0, pending: 1 },
      }],
      expandedStoryboardIds: new Set(['story-1']),
      onToggleStoryboard: vi.fn(),
      isBatchSubmitting: true,
      linkedPanels: new Map(),
      highlightedPanelKey: null,
      panelRefs: { current: new Map() },
      videoRatio: '16:9',
      defaultVideoModel: 'model-default',
      capabilityOverrides: {},
      projectId: 'project-1',
      episodeId: 'episode-1',
      runningVoiceLineIds: new Set(),
      panelVoiceLines: new Map(),
      panelVideoPreference: new Map(),
      savingPrompts: new Set(),
      flModel: '',
      flModelOptions: [],
      flGenerationOptions: {},
      flGenerationOptionsByPanel: new Map(),
      flCapabilityFields: [],
      flMissingCapabilityFields: [],
      promptEntries: new Map(),
      onGenerateVideo: vi.fn(async () => undefined),
      onUpdatePanelVideoModel: vi.fn(),
      onUpdatePanelVideoDurationBinding: vi.fn(),
      onRestorePreviousVideo: vi.fn(),
      onLipSync: vi.fn(),
      onToggleLink: vi.fn(),
      onFlModelChange: vi.fn(),
      onFlCapabilityChange: vi.fn(),
      onRestoreFlSmartDuration: vi.fn(),
      onFlPromptChange: vi.fn(),
      onSaveFlPrompt: vi.fn(),
      onRegenerateFlPrompt: vi.fn(),
      onGenerateFirstLastFrame: vi.fn(),
      onPreviewImage: vi.fn(),
      onToggleLipSyncVideo: vi.fn(),
      getNextPanel: () => null,
      isLinkedAsLastFrame: () => false,
      getFirstLastFrameDurationStatus: () => null,
      getLocalPrompt: () => '',
      updateLocalPrompt: vi.fn(),
      savePrompt: vi.fn(),
    } as unknown as ComponentProps<typeof VideoRenderPanel>

    const markup = renderToStaticMarkup(React.createElement(VideoRenderPanel, props))

    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>segments\.generatePending<\/button>/)
  })
})
