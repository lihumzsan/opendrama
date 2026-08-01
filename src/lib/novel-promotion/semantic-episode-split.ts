import { countWords } from '@/lib/word-count'

export type EpisodeSourceKind = 'screenplay' | 'prose' | 'mixed'

export interface EpisodeSourceUnit {
  id: string
  kind: 'scene' | 'chapter' | 'paragraph'
  startIndex: number
  endIndex: number
  text: string
  title: string
  wordCount: number
}

export interface EpisodeAnalysisBatch {
  id: string
  startUnitId: string
  endUnitId: string
  units: EpisodeSourceUnit[]
  characterCount: number
}

export interface NarrativeBoundaryScore {
  closure: number
  hook: number
  transition: number
  causalBreakPenalty: number
  recommended: boolean
}

export interface NarrativeScene {
  id: string
  startUnitId: string
  endUnitId: string
  unitIds: string[]
  startIndex: number
  endIndex: number
  title: string
  summary: string
  characters: string[]
  location: string
  time: string
  goal: string
  conflict: string
  outcome: string
  plotline: string
  unresolvedThreads: string[]
  turningPoint: string
  boundaryAfter: NarrativeBoundaryScore
  content: string
  wordCount: number
  estimatedMinutes: number
}

export type SemanticEpisodeProfile = 'horizontal_motion_comic' | 'regular_episode'

export interface SemanticSplitEpisode {
  number: number
  title: string
  summary: string
  content: string
  wordCount: number
  estimatedMinutes: number
  coreGoal: string
  dramaticArc: string
  endingHook: string
  rationale: string
  startSceneId: string
  endSceneId: string
  sceneIds: string[]
  scenes: NarrativeScene[]
}

export interface SemanticEpisodeSplitResult {
  success: true
  method: 'semantic'
  profile: SemanticEpisodeProfile
  estimatedTotalMinutes: number
  episodes: SemanticSplitEpisode[]
  scenes: NarrativeScene[]
}

const SCREENPLAY_HEADING_PATTERN =
  /^(?:\s*\d+\s*-\s*\d+\s*[【\[]|(?:INT|EXT|内景|外景)[.\s：:]|场景\s*\d+|第\s*[一二三四五六七八九十百千\d]+\s*场)/gim
const CHAPTER_HEADING_PATTERN =
  /^第\s*[一二三四五六七八九十百千万零〇两\d]+\s*[章回卷幕][^\r\n]*$/gm

function collectMatchIndexes(content: string, pattern: RegExp) {
  const regex = new RegExp(pattern.source, pattern.flags)
  const indexes: number[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    indexes.push(match.index)
    if (match[0].length === 0) regex.lastIndex += 1
  }
  return indexes
}

export function classifyEpisodeSource(content: string): EpisodeSourceKind {
  const sceneCount = collectMatchIndexes(content, SCREENPLAY_HEADING_PATTERN).length
  const chapterCount = collectMatchIndexes(content, CHAPTER_HEADING_PATTERN).length
  if (sceneCount > 0 && chapterCount > 0) return 'mixed'
  if (sceneCount >= 2) return 'screenplay'
  return 'prose'
}

function collectParagraphStarts(content: string) {
  const starts = [0]
  const separatorPattern = /\n[ \t]*\n+(?=[ \t]*\S)/g
  let match: RegExpExecArray | null
  while ((match = separatorPattern.exec(content)) !== null) {
    starts.push(match.index + match[0].length)
  }
  return starts
}

function uniqueSortedStarts(content: string, starts: number[]) {
  const normalized = [...new Set(starts.filter((index) => index >= 0 && index < content.length))]
    .sort((a, b) => a - b)
  if (normalized[0] !== 0) normalized.unshift(0)
  return normalized
}

export function buildEpisodeSourceUnits(content: string): EpisodeSourceUnit[] {
  if (!content) return []

  const sourceKind = classifyEpisodeSource(content)
  const sceneStarts = collectMatchIndexes(content, SCREENPLAY_HEADING_PATTERN)
  const chapterStarts = collectMatchIndexes(content, CHAPTER_HEADING_PATTERN)
  let starts: number[]
  let unitKind: EpisodeSourceUnit['kind']

  if (sourceKind === 'screenplay') {
    starts = uniqueSortedStarts(content, sceneStarts)
    unitKind = 'scene'
  } else if (sourceKind === 'mixed') {
    starts = uniqueSortedStarts(content, [...sceneStarts, ...chapterStarts])
    unitKind = 'scene'
  } else {
    starts = uniqueSortedStarts(content, collectParagraphStarts(content))
    unitKind = 'paragraph'
  }

  return starts.map((startIndex, index) => {
    const endIndex = starts[index + 1] ?? content.length
    const text = content.slice(startIndex, endIndex)
    const title = text.split(/\r?\n/, 1)[0]?.trim().slice(0, 80) || `Unit ${index + 1}`
    return {
      id: `unit_${String(index + 1).padStart(4, '0')}`,
      kind: unitKind,
      startIndex,
      endIndex,
      text,
      title,
      wordCount: countWords(text),
    }
  })
}

export function buildEpisodeAnalysisBatches(
  units: EpisodeSourceUnit[],
  maxChars = 12_000,
): EpisodeAnalysisBatch[] {
  if (units.length === 0) return []
  const batches: EpisodeAnalysisBatch[] = []
  let current: EpisodeSourceUnit[] = []
  let currentChars = 0

  const flush = () => {
    if (current.length === 0) return
    batches.push({
      id: `batch_${String(batches.length + 1).padStart(3, '0')}`,
      startUnitId: current[0].id,
      endUnitId: current[current.length - 1].id,
      units: current,
      characterCount: currentChars,
    })
    current = []
    currentChars = 0
  }

  for (const unit of units) {
    if (current.length > 0 && currentChars + unit.text.length > maxChars) {
      flush()
    }
    current.push(unit)
    currentChars += unit.text.length
  }
  flush()
  return batches
}

export function estimateEpisodeRuntimeMinutes(content: string) {
  return Math.max(0.1, Number((countWords(content) / 250).toFixed(1)))
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function readText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function readScore(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(10, value))
}

export function normalizeNarrativeScenes(
  units: EpisodeSourceUnit[],
  rawScenes: unknown,
): NarrativeScene[] {
  if (units.length === 0) return []
  if (!Array.isArray(rawScenes) || rawScenes.length === 0) {
    throw new Error('narrative scene analysis is empty')
  }

  const unitIndexById = new Map(units.map((unit, index) => [unit.id, index]))
  const scenes: NarrativeScene[] = []
  let expectedStartIndex = 0

  for (let sceneIndex = 0; sceneIndex < rawScenes.length; sceneIndex += 1) {
    const raw = asRecord(rawScenes[sceneIndex])
    const startUnitId = readText(raw.startUnitId)
    const endUnitId = readText(raw.endUnitId)
    const startUnitIndex = unitIndexById.get(startUnitId)
    const endUnitIndex = unitIndexById.get(endUnitId)
    if (startUnitIndex === undefined || endUnitIndex === undefined || endUnitIndex < startUnitIndex) {
      throw new Error(`invalid source unit range for scene ${sceneIndex + 1}`)
    }
    if (startUnitIndex !== expectedStartIndex) {
      const kind = startUnitIndex > expectedStartIndex ? 'gap' : 'overlap'
      throw new Error(`source unit coverage ${kind} before ${startUnitId}`)
    }

    const sceneUnits = units.slice(startUnitIndex, endUnitIndex + 1)
    const content = sceneUnits.map((unit) => unit.text).join('')
    const boundary = asRecord(raw.boundaryAfter)
    scenes.push({
      id: `scene_${String(sceneIndex + 1).padStart(3, '0')}`,
      startUnitId,
      endUnitId,
      unitIds: sceneUnits.map((unit) => unit.id),
      startIndex: sceneUnits[0].startIndex,
      endIndex: sceneUnits[sceneUnits.length - 1].endIndex,
      title: readText(raw.title, `场景 ${sceneIndex + 1}`),
      summary: readText(raw.summary),
      characters: readStringArray(raw.characters),
      location: readText(raw.location),
      time: readText(raw.time),
      goal: readText(raw.goal),
      conflict: readText(raw.conflict),
      outcome: readText(raw.outcome),
      plotline: readText(raw.plotline, 'main'),
      unresolvedThreads: readStringArray(raw.unresolvedThreads),
      turningPoint: readText(raw.turningPoint, 'none'),
      boundaryAfter: {
        closure: readScore(boundary.closure),
        hook: readScore(boundary.hook),
        transition: readScore(boundary.transition),
        causalBreakPenalty: readScore(boundary.causalBreakPenalty),
        recommended: boundary.recommended === true,
      },
      content,
      wordCount: countWords(content),
      estimatedMinutes: estimateEpisodeRuntimeMinutes(content),
    })
    expectedStartIndex = endUnitIndex + 1
  }

  if (expectedStartIndex !== units.length) {
    throw new Error(`source unit coverage gap after ${units[expectedStartIndex - 1]?.id || 'start'}`)
  }
  return scenes
}

function readProfile(value: unknown): SemanticEpisodeProfile {
  if (value === 'horizontal_motion_comic' || value === 'regular_episode') return value
  throw new Error('invalid semantic episode profile')
}

export function assembleSemanticEpisodes(
  content: string,
  scenes: NarrativeScene[],
  rawPlan: unknown,
): SemanticEpisodeSplitResult {
  if (scenes.length === 0) throw new Error('narrative scenes are empty')
  const plan = asRecord(rawPlan)
  const profile = readProfile(plan.profile)
  if (!Array.isArray(plan.episodes) || plan.episodes.length === 0) {
    throw new Error('semantic episode plan is empty')
  }

  const sceneIndexById = new Map(scenes.map((scene, index) => [scene.id, index]))
  const episodes: SemanticSplitEpisode[] = []
  let expectedStartIndex = 0

  for (let episodeIndex = 0; episodeIndex < plan.episodes.length; episodeIndex += 1) {
    const rawEpisode = asRecord(plan.episodes[episodeIndex])
    const startSceneId = readText(rawEpisode.startSceneId)
    const endSceneId = readText(rawEpisode.endSceneId)
    const startSceneIndex = sceneIndexById.get(startSceneId)
    const endSceneIndex = sceneIndexById.get(endSceneId)
    if (startSceneIndex === undefined || endSceneIndex === undefined || endSceneIndex < startSceneIndex) {
      throw new Error(`invalid scene range for episode ${episodeIndex + 1}`)
    }
    if (startSceneIndex !== expectedStartIndex) {
      const kind = startSceneIndex > expectedStartIndex ? 'gap' : 'overlap'
      throw new Error(`scene coverage ${kind} before ${startSceneId}`)
    }

    const episodeScenes = scenes.slice(startSceneIndex, endSceneIndex + 1)
    const episodeContent = content.slice(
      episodeScenes[0].startIndex,
      episodeScenes[episodeScenes.length - 1].endIndex,
    )
    episodes.push({
      number: episodeIndex + 1,
      title: readText(rawEpisode.title, `第 ${episodeIndex + 1} 集`),
      summary: readText(rawEpisode.summary),
      content: episodeContent,
      wordCount: countWords(episodeContent),
      estimatedMinutes: estimateEpisodeRuntimeMinutes(episodeContent),
      coreGoal: readText(rawEpisode.coreGoal),
      dramaticArc: readText(rawEpisode.dramaticArc),
      endingHook: readText(rawEpisode.endingHook),
      rationale: readText(rawEpisode.rationale),
      startSceneId,
      endSceneId,
      sceneIds: episodeScenes.map((scene) => scene.id),
      scenes: episodeScenes,
    })
    expectedStartIndex = endSceneIndex + 1
  }

  if (expectedStartIndex !== scenes.length) {
    throw new Error(`scene coverage gap after ${scenes[expectedStartIndex - 1]?.id || 'start'}`)
  }
  if (episodes.map((episode) => episode.content).join('') !== content) {
    throw new Error('assembled episode content does not exactly cover the source')
  }

  return {
    success: true,
    method: 'semantic',
    profile,
    estimatedTotalMinutes: estimateEpisodeRuntimeMinutes(content),
    episodes,
    scenes,
  }
}
