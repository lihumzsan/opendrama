'use client'

import EpisodeScreenplayPanel from './EpisodeScreenplayPanel'
import { useWorkspaceEpisodeStageData } from '../hooks/useWorkspaceEpisodeStageData'

export default function ScriptStage() {
  const { screenplay } = useWorkspaceEpisodeStageData('storyboard')

  return (
    <EpisodeScreenplayPanel screenplay={screenplay} />
  )
}
