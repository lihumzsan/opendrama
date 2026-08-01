export interface SplitEpisodeScene {
  id: string
  title: string
  summary: string
  content: string
  wordCount: number
  estimatedMinutes: number
  characters?: string[]
  location?: string
  time?: string
  goal?: string
  conflict?: string
  outcome?: string
  turningPoint?: string
  boundaryAfter?: {
    closure: number
    hook: number
    transition: number
    causalBreakPenalty: number
    recommended: boolean
  }
}

export interface SplitEpisode {
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
  scenes?: SplitEpisodeScene[]
}

export type WizardStage = 'select' | 'analyzing' | 'preview'

export interface DeleteConfirmState {
  show: boolean
  index: number
  title: string
}
