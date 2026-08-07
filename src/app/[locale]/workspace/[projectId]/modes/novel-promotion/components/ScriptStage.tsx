'use client'

import EpisodeScreenplayPanel from './EpisodeScreenplayPanel'
import { useWorkspaceEpisodeStageData } from '../hooks/useWorkspaceEpisodeStageData'
import { useWorkspaceStageRuntime } from '../WorkspaceStageRuntimeContext'

export default function ScriptStage() {
  const { screenplay } = useWorkspaceEpisodeStageData('storyboard')
  const {
    isConfirmingAssets,
    isStartingScriptToStoryboard,
    onRunScriptToStoryboard,
  } = useWorkspaceStageRuntime()

  return (
    <EpisodeScreenplayPanel
      screenplay={screenplay}
      isGeneratingStoryboard={isStartingScriptToStoryboard || isConfirmingAssets}
      onGenerateStoryboard={() => void onRunScriptToStoryboard()}
    />
  )
}
