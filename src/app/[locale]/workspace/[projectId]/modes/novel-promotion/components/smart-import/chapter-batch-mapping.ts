import { countWords } from '@/lib/word-count'
import type { CandidateEpisodePlan } from '@/lib/novel-promotion/chapter-batch/types'

import type { SplitEpisode } from './types'

export function mapChapterBatchPlanToSplitEpisodes(plan: CandidateEpisodePlan): SplitEpisode[] {
  return plan.episodes.map((episode) => ({
    number: episode.provisionalNumber,
    title: episode.name,
    summary: episode.description,
    content: episode.sourceText,
    wordCount: countWords(episode.sourceText),
    coreGoal: episode.coreGoal,
    dramaticArc: episode.dramaticArc,
    endingHook: episode.endingHook,
    rationale: plan.rationale,
  }))
}
