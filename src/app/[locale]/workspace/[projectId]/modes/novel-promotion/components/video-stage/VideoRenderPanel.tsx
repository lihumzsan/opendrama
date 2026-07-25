'use client'

import { useMemo, useState, type MutableRefObject } from 'react'
import { getAspectRatioConfig } from '@/lib/constants'
import { logError as _ulogError } from '@/lib/logging/core'
import type { CapabilitySelections, CapabilityValue } from '@/lib/model-config-contract'
import type {
  FirstLastFrameDurationStatus,
  FirstLastFramePromptEntry,
} from '@/lib/novel-promotion/stages/video-stage-runtime/first-last-frame-prompt-entry'
import { resolvePanelFirstLastFrameGenerationOptions } from '@/lib/novel-promotion/stages/video-stage-runtime/first-last-frame-prompt-entry'
import {
  selectFailedVideoPanels,
  selectPendingVideoPanels,
  type VideoPanelGroup,
} from '@/lib/novel-promotion/stages/video-stage-runtime/video-panel-groups'
import type { PromptField } from '@/lib/novel-promotion/stages/video-stage-runtime/useVideoPromptState'
import {
  VideoPanelCard,
  type FirstLastFrameParams,
  type MatchedVoiceLine,
  type VideoDurationBinding,
  type VideoGenerationOptions,
  type VideoModelOption,
  type VideoPanel,
} from '../video'
import VideoSegmentGroup from './VideoSegmentGroup'

interface VideoRenderPanelProps {
  allPanels: VideoPanel[]
  panelGroups: VideoPanelGroup[]
  expandedStoryboardIds: ReadonlySet<string>
  onToggleStoryboard: (storyboardId: string) => void
  isBatchSubmitting?: boolean
  linkedPanels: Map<string, boolean>
  highlightedPanelKey: string | null
  panelRefs: MutableRefObject<Map<string, HTMLDivElement>>
  videoRatio: string
  defaultVideoModel: string
  capabilityOverrides: CapabilitySelections
  userVideoModels?: VideoModelOption[]
  lipSyncEnabled?: boolean
  projectId: string
  episodeId: string
  runningVoiceLineIds: Set<string>
  panelVoiceLines: Map<string, MatchedVoiceLine[]>
  panelVideoPreference: Map<string, boolean>
  savingPrompts: Set<string>
  flModel: string
  flModelOptions: VideoModelOption[]
  flGenerationOptions: VideoGenerationOptions
  flGenerationOptionsByPanel: Map<string, VideoGenerationOptions>
  flCapabilityFields: Array<{
    field: string
    label: string
    options: CapabilityValue[]
    disabledOptions?: CapabilityValue[]
    value: CapabilityValue | undefined
  }>
  flMissingCapabilityFields: string[]
  promptEntries: Map<string, FirstLastFramePromptEntry>
  onGenerateVideo: (
    storyboardId: string,
    panelIndex: number,
    videoModel?: string,
    firstLastFrame?: FirstLastFrameParams,
    generationOptions?: VideoGenerationOptions,
    panelId?: string,
    videoDurationBinding?: VideoDurationBinding,
    customPrompt?: string,
    customPromptEditedByUser?: boolean,
  ) => Promise<void>
  onUpdatePanelVideoModel: (storyboardId: string, panelIndex: number, model: string) => Promise<void>
  onUpdatePanelVideoDurationBinding: (storyboardId: string, panelIndex: number, binding: VideoDurationBinding) => Promise<void>
  onRestorePreviousVideo: (storyboardId: string, panelIndex: number, panelId?: string) => Promise<void>
  onLipSync: (storyboardId: string, panelIndex: number, voiceLineId: string, panelId?: string) => Promise<void>
  onToggleLink: (panelKey: string, storyboardId: string, panelIndex: number) => Promise<void>
  onFlModelChange: (model: string) => void
  onFlCapabilityChange: (panelKey: string, field: string, rawValue: string) => Promise<void>
  onRestoreFlSmartDuration: (panelKey: string) => Promise<void>
  onFlPromptChange: (key: string, value: string) => void
  onSaveFlPrompt: (key: string, value: string) => Promise<void>
  onRegenerateFlPrompt: (key: string) => Promise<void>
  onGenerateFirstLastFrame: (
    firstStoryboardId: string,
    firstPanelIndex: number,
    lastStoryboardId: string,
    lastPanelIndex: number,
    panelKey: string,
    generationOptions?: VideoGenerationOptions,
    firstPanelId?: string,
  ) => Promise<void>
  onPreviewImage: (imageUrl: string | null) => void
  onToggleLipSyncVideo: (key: string, value: boolean) => void
  getNextPanel: (currentIndex: number) => VideoPanel | null
  isLinkedAsLastFrame: (currentIndex: number) => boolean
  getFirstLastFrameDurationStatus: (panelKey: string) => FirstLastFrameDurationStatus | null
  getLocalPrompt: (panelKey: string, externalPrompt?: string, field?: PromptField) => string
  updateLocalPrompt: (panelKey: string, value: string, field?: PromptField) => void
  savePrompt: (
    storyboardId: string,
    panelIndex: number,
    panelKey: string,
    value: string,
    field?: PromptField,
  ) => Promise<void>
}

export default function VideoRenderPanel({
  allPanels,
  panelGroups,
  expandedStoryboardIds,
  onToggleStoryboard,
  isBatchSubmitting = false,
  linkedPanels,
  highlightedPanelKey,
  panelRefs,
  videoRatio,
  defaultVideoModel,
  capabilityOverrides,
  userVideoModels,
  lipSyncEnabled = false,
  projectId,
  episodeId,
  runningVoiceLineIds,
  panelVoiceLines,
  panelVideoPreference,
  savingPrompts,
  flModel,
  flModelOptions,
  flGenerationOptions,
  flGenerationOptionsByPanel,
  flCapabilityFields,
  flMissingCapabilityFields,
  promptEntries,
  onGenerateVideo,
  onUpdatePanelVideoModel,
  onUpdatePanelVideoDurationBinding,
  onRestorePreviousVideo,
  onLipSync,
  onToggleLink,
  onFlModelChange,
  onFlCapabilityChange,
  onRestoreFlSmartDuration,
  onFlPromptChange,
  onSaveFlPrompt,
  onRegenerateFlPrompt,
  onGenerateFirstLastFrame,
  onPreviewImage,
  onToggleLipSyncVideo,
  getNextPanel,
  isLinkedAsLastFrame,
  getFirstLastFrameDurationStatus,
  getLocalPrompt,
  updateLocalPrompt,
  savePrompt,
}: VideoRenderPanelProps) {
  const [submittingStoryboardIds, setSubmittingStoryboardIds] = useState<Set<string>>(new Set())
  const globalIndexByPanelKey = useMemo(() => new Map(
    allPanels.map((panel, index) => [`${panel.storyboardId}-${panel.panelIndex}`, index]),
  ), [allPanels])
  const gridClassName = getAspectRatioConfig(videoRatio).isVertical
    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'

  const submitGroupPanels = async (
    group: VideoPanelGroup,
    selector: (panels: readonly VideoPanel[]) => VideoPanel[],
  ) => {
    const targets = selector(group.panels)
    if (targets.length === 0 || submittingStoryboardIds.has(group.storyboardId)) return

    setSubmittingStoryboardIds((previous) => new Set(previous).add(group.storyboardId))
    try {
      for (const panel of targets) {
        try {
          await onGenerateVideo(
            panel.storyboardId,
            panel.panelIndex,
            panel.videoModel || defaultVideoModel || undefined,
            undefined,
            undefined,
            panel.panelId,
            panel.videoDurationBinding,
          )
        } catch (error) {
          _ulogError('Failed to submit segment video generation:', error)
        }
      }
    } finally {
      setSubmittingStoryboardIds((previous) => {
        const next = new Set(previous)
        next.delete(group.storyboardId)
        return next
      })
    }
  }

  return (
    <div className="space-y-4">
      {panelGroups.map((group) => {
        const isExpanded = expandedStoryboardIds.has(group.storyboardId)
        const isSubmitting = submittingStoryboardIds.has(group.storyboardId)

        return (
          <VideoSegmentGroup
            key={group.storyboardId}
            group={group}
            expanded={isExpanded}
            isSubmitting={isSubmitting || isBatchSubmitting}
            onToggle={() => onToggleStoryboard(group.storyboardId)}
            onGeneratePending={() => void submitGroupPanels(group, selectPendingVideoPanels)}
            onRetryFailed={() => void submitGroupPanels(group, selectFailedVideoPanels)}
          >
            <div className={`grid gap-4 ${gridClassName}`}>
              {group.panels.map((panel) => {
                const panelKey = `${panel.storyboardId}-${panel.panelIndex}`
                const globalIndex = globalIndexByPanelKey.get(panelKey) ?? 0
                const isLinked = linkedPanels.get(panelKey) || false
                const isLastFrame = isLinkedAsLastFrame(globalIndex)
                const nextPanel = getNextPanel(globalIndex)
                const prevPanel = globalIndex > 0 ? allPanels[globalIndex - 1] : null
                const hasNext = globalIndex < allPanels.length - 1
                const promptField: PromptField = isLinked ? 'firstLastFramePrompt' : 'videoPrompt'
                const flPromptEntry = isLinked ? promptEntries.get(panelKey) : undefined
                const panelFlGenerationOptions = resolvePanelFirstLastFrameGenerationOptions(
                  panelKey,
                  flGenerationOptions,
                  flGenerationOptionsByPanel,
                  panel.videoDurationBinding?.targetDurationSeconds,
                )
                const panelFlCapabilityFields = flCapabilityFields.map((field) => field.field === 'duration'
                  ? { ...field, value: panelFlGenerationOptions.duration ?? field.value }
                  : field)
                const flDurationStatus = isLinked
                  ? getFirstLastFrameDurationStatus(panelKey)
                  : null
                const localPrompt = isLinked
                  ? (flPromptEntry?.value || '')
                  : getLocalPrompt(panelKey, panel.textPanel?.video_prompt, promptField)
                const isSavingPrompt = isLinked
                  ? flPromptEntry?.status === 'saving'
                  : savingPrompts.has(`${promptField}:${panelKey}`)

                return (
                  <div
                    key={panelKey}
                    ref={(element) => {
                      if (element) panelRefs.current.set(panelKey, element)
                      else panelRefs.current.delete(panelKey)
                    }}
                    className={`transition-all duration-500 ${highlightedPanelKey === panelKey
                      ? 'ring-4 ring-[var(--glass-stroke-focus)] ring-offset-2 ring-offset-[var(--glass-bg-canvas)] rounded-2xl scale-[1.02]'
                      : ''}`}
                    style={{
                      contentVisibility: 'auto',
                      containIntrinsicSize: '0 720px',
                    }}
                  >
                    <VideoPanelCard
                      panel={{
                        ...panel,
                        lipSyncTaskRunning: panel.lipSyncTaskRunning || false,
                      }}
                      panelIndex={globalIndex}
                      defaultVideoModel={defaultVideoModel}
                      capabilityOverrides={capabilityOverrides}
                      videoRatio={videoRatio}
                      userVideoModels={userVideoModels}
                      lipSyncEnabled={lipSyncEnabled}
                      projectId={projectId}
                      episodeId={episodeId}
                      runningVoiceLineIds={runningVoiceLineIds}
                      matchedVoiceLines={panelVoiceLines.get(panelKey) || []}
                      onLipSync={onLipSync}
                      showLipSyncVideo={panelVideoPreference.get(panelKey) ?? true}
                      onToggleLipSyncVideo={onToggleLipSyncVideo}
                      isLinked={isLinked}
                      isLastFrame={isLastFrame}
                      nextPanel={nextPanel}
                      prevPanel={prevPanel}
                      hasNext={hasNext}
                      flModel={flModel}
                      flModelOptions={flModelOptions}
                      flGenerationOptions={panelFlGenerationOptions}
                      flCapabilityFields={panelFlCapabilityFields}
                      flMissingCapabilityFields={flMissingCapabilityFields}
                      flPromptEntry={flPromptEntry}
                      flDurationStatus={flDurationStatus}
                      localPrompt={localPrompt}
                      isSavingPrompt={isSavingPrompt}
                      onUpdateLocalPrompt={(value) => {
                        if (isLinked) onFlPromptChange(panelKey, value)
                        else updateLocalPrompt(panelKey, value, promptField)
                      }}
                      onSavePrompt={(value) => isLinked
                        ? onSaveFlPrompt(panelKey, value)
                        : savePrompt(panel.storyboardId, panel.panelIndex, panelKey, value, promptField)}
                      onGenerateVideo={onGenerateVideo}
                      onUpdatePanelVideoModel={onUpdatePanelVideoModel}
                      onUpdatePanelVideoDurationBinding={onUpdatePanelVideoDurationBinding}
                      onRestorePreviousVideo={onRestorePreviousVideo}
                      onToggleLink={onToggleLink}
                      onFlModelChange={onFlModelChange}
                      onFlCapabilityChange={(field, rawValue) => onFlCapabilityChange(panelKey, field, rawValue)}
                      onRestoreFlSmartDuration={onRestoreFlSmartDuration}
                      onFlPromptChange={onFlPromptChange}
                      onRegenerateFlPrompt={onRegenerateFlPrompt}
                      onGenerateFirstLastFrame={onGenerateFirstLastFrame}
                      onPreviewImage={onPreviewImage}
                    />
                  </div>
                )
              })}
            </div>
          </VideoSegmentGroup>
        )
      })}
    </div>
  )
}
