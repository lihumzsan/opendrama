import { createHash } from 'node:crypto'

import type {
  CandidateEpisodeAdaptationNotes,
  CandidateEpisodeDraft,
  CandidateEpisodePlan,
} from './types'

function normalizeSourceText(sourceText: string) {
  return sourceText.replace(/\r\n/g, '\n').trim()
}

export function hashChapterBatchSource(sourceText: string) {
  return createHash('sha256').update(normalizeSourceText(sourceText)).digest('hex')
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function readRequiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required`)
  }
  return value.trim()
}

function readRequiredNumber(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${field} must be an integer`)
  }
  return value
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeAdaptationNotes(value: unknown): CandidateEpisodeAdaptationNotes {
  const notes = asRecord(value)
  return {
    keep: readStringArray(notes.keep),
    merge: readStringArray(notes.merge),
    remove: readStringArray(notes.remove),
    externalize: readStringArray(notes.externalize),
    inferred: readStringArray(notes.inferred),
  }
}

function normalizeEpisode(sourceText: string, rawEpisode: unknown, expectedStart: number, index: number): CandidateEpisodeDraft {
  const episode = asRecord(rawEpisode)
  const sourceStart = readRequiredNumber(episode.sourceStart, `episode ${index + 1} sourceStart`)
  const sourceEnd = readRequiredNumber(episode.sourceEnd, `episode ${index + 1} sourceEnd`)

  if (sourceStart !== expectedStart) {
    throw new Error(`episode ${index + 1} sourceStart must start at ${expectedStart}`)
  }
  if (sourceEnd <= sourceStart || sourceEnd > sourceText.length) {
    throw new Error(`episode ${index + 1} source range is invalid`)
  }

  const expectedSourceText = sourceText.slice(sourceStart, sourceEnd)
  const episodeSourceText = readRequiredString(episode.sourceText, `episode ${index + 1} sourceText`)
  if (episodeSourceText !== expectedSourceText) {
    throw new Error(`episode ${index + 1} sourceText does not match source range`)
  }

  return {
    provisionalNumber: readRequiredNumber(episode.provisionalNumber, `episode ${index + 1} provisionalNumber`),
    name: readRequiredString(episode.name, `episode ${index + 1} name`),
    description: readRequiredString(episode.description, `episode ${index + 1} description`),
    sourceStart,
    sourceEnd,
    sourceText: episodeSourceText,
    coreGoal: readRequiredString(episode.coreGoal, `episode ${index + 1} coreGoal`),
    dramaticArc: readRequiredString(episode.dramaticArc, `episode ${index + 1} dramaticArc`),
    endingHook: readRequiredString(episode.endingHook, `episode ${index + 1} endingHook`),
    adaptationNotes: normalizeAdaptationNotes(episode.adaptationNotes),
  }
}

function normalizePlan(sourceText: string, rawPlan: unknown, index: number): CandidateEpisodePlan {
  const plan = asRecord(rawPlan)
  const rawEpisodes = Array.isArray(plan.episodes) ? plan.episodes : []
  if (rawEpisodes.length === 0) {
    throw new Error(`plan ${index + 1} episodes are required`)
  }

  let expectedStart = 0
  const episodes = rawEpisodes.map((episode, episodeIndex) => {
    const normalized = normalizeEpisode(sourceText, episode, expectedStart, episodeIndex)
    expectedStart = normalized.sourceEnd
    return normalized
  })
  if (expectedStart !== sourceText.length) {
    throw new Error(`plan ${index + 1} episodes must cover the complete source text`)
  }

  return {
    planId: readRequiredString(plan.planId, `plan ${index + 1} planId`),
    title: readRequiredString(plan.title, `plan ${index + 1} title`),
    rationale: readRequiredString(plan.rationale, `plan ${index + 1} rationale`),
    episodes,
  }
}

export function validateCandidateEpisodePlans(sourceText: string, plans: unknown): CandidateEpisodePlan[] {
  const normalizedSourceText = normalizeSourceText(sourceText)
  if (!normalizedSourceText) throw new Error('sourceText is required')
  if (!Array.isArray(plans) || plans.length === 0) {
    throw new Error('candidate episode plans are required')
  }

  return plans.map((plan, index) => normalizePlan(normalizedSourceText, plan, index))
}
