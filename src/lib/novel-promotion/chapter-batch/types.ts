export type ChapterBatchStatus = 'draft' | 'analyzing' | 'analyzed' | 'failed' | 'confirmed' | 'discarded'

export type ChapterBatchAnalysis = {
  summary: string
  characterChanges: string[]
  locations: string[]
  props: string[]
  plotlines: string[]
  unresolvedThreads: string[]
  inferred: string[]
}

export type CandidateEpisodeAdaptationNotes = {
  keep: string[]
  merge: string[]
  remove: string[]
  externalize: string[]
  inferred: string[]
}

export type CandidateEpisodeDraft = {
  provisionalNumber: number
  name: string
  description: string
  sourceStart: number
  sourceEnd: number
  sourceText: string
  coreGoal: string
  dramaticArc: string
  endingHook: string
  adaptationNotes: CandidateEpisodeAdaptationNotes
}

export type CandidateEpisodePlan = {
  planId: string
  title: string
  rationale: string
  episodes: CandidateEpisodeDraft[]
}
