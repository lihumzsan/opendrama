import { countWords } from '@/lib/word-count'
import type { SplitEpisode, SplitEpisodeScene } from './types'

function runtimeMinutes(content: string) {
  return Math.max(0.1, Number((countWords(content) / 250).toFixed(1)))
}

function rebuildEpisode(
  episode: SplitEpisode,
  scenes: SplitEpisodeScene[],
): SplitEpisode {
  const content = scenes.map((scene) => scene.content).join('')
  return {
    ...episode,
    content,
    wordCount: countWords(content),
    estimatedMinutes: runtimeMinutes(content),
    startSceneId: scenes[0]?.id,
    endSceneId: scenes.at(-1)?.id,
    sceneIds: scenes.map((scene) => scene.id),
    scenes,
  }
}

function renumber(episodes: SplitEpisode[], startingNumber: number) {
  return episodes.map((episode, index) => ({
    ...episode,
    number: startingNumber + index,
  }))
}

export function mergeEpisodeWithNext(
  episodes: SplitEpisode[],
  episodeIndex: number,
): SplitEpisode[] {
  const current = episodes[episodeIndex]
  const next = episodes[episodeIndex + 1]
  if (!current?.scenes?.length || !next?.scenes?.length) return episodes

  const merged = rebuildEpisode(
    {
      ...current,
      title: current.title || next.title,
      summary: [current.summary, next.summary].filter(Boolean).join('；'),
      coreGoal: [current.coreGoal, next.coreGoal].filter(Boolean).join('；'),
      dramaticArc: '',
      endingHook: next.endingHook || current.endingHook,
      rationale: '',
    },
    [...current.scenes, ...next.scenes],
  )
  const result = [
    ...episodes.slice(0, episodeIndex),
    merged,
    ...episodes.slice(episodeIndex + 2),
  ]
  return renumber(result, episodes[0]?.number ?? 1)
}

export function splitEpisodeAfterScene(
  episodes: SplitEpisode[],
  episodeIndex: number,
  sceneId: string,
): SplitEpisode[] {
  const current = episodes[episodeIndex]
  if (!current?.scenes?.length) return episodes
  const sceneIndex = current.scenes.findIndex((scene) => scene.id === sceneId)
  if (sceneIndex < 0 || sceneIndex >= current.scenes.length - 1) return episodes

  const left = rebuildEpisode(
    { ...current, dramaticArc: '', endingHook: '', rationale: '' },
    current.scenes.slice(0, sceneIndex + 1),
  )
  const right = rebuildEpisode(
    {
      ...current,
      title: '',
      summary: '',
      coreGoal: '',
      dramaticArc: '',
      endingHook: current.endingHook,
      rationale: '',
    },
    current.scenes.slice(sceneIndex + 1),
  )
  const result = [
    ...episodes.slice(0, episodeIndex),
    left,
    right,
    ...episodes.slice(episodeIndex + 1),
  ]
  return renumber(result, episodes[0]?.number ?? 1)
}

export function moveLastSceneToNextEpisode(
  episodes: SplitEpisode[],
  episodeIndex: number,
): SplitEpisode[] {
  const current = episodes[episodeIndex]
  const next = episodes[episodeIndex + 1]
  if (!current?.scenes || current.scenes.length <= 1 || !next?.scenes?.length) return episodes

  const movedScene = current.scenes.at(-1)
  if (!movedScene) return episodes
  const result = [...episodes]
  result[episodeIndex] = rebuildEpisode(current, current.scenes.slice(0, -1))
  result[episodeIndex + 1] = rebuildEpisode(next, [movedScene, ...next.scenes])
  return result
}

export function moveFirstSceneToPreviousEpisode(
  episodes: SplitEpisode[],
  episodeIndex: number,
): SplitEpisode[] {
  const previous = episodes[episodeIndex - 1]
  const current = episodes[episodeIndex]
  if (!previous?.scenes?.length || !current?.scenes || current.scenes.length <= 1) return episodes

  const movedScene = current.scenes[0]
  if (!movedScene) return episodes
  const result = [...episodes]
  result[episodeIndex - 1] = rebuildEpisode(previous, [...previous.scenes, movedScene])
  result[episodeIndex] = rebuildEpisode(current, current.scenes.slice(1))
  return result
}
