import { describe, expect, it } from 'vitest'
import {
  mergeEpisodeWithNext,
  moveFirstSceneToPreviousEpisode,
  moveLastSceneToNextEpisode,
  splitEpisodeAfterScene,
} from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/smart-import/preview-operations'
import type {
  SplitEpisode,
  SplitEpisodeScene,
} from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/smart-import/types'

function scene(id: string, content: string): SplitEpisodeScene {
  return {
    id,
    title: id,
    summary: '',
    content,
    wordCount: content.length,
    estimatedMinutes: 1,
  }
}

function episode(number: number, scenes: SplitEpisodeScene[]): SplitEpisode {
  return {
    number,
    title: `第 ${number} 集`,
    summary: '',
    content: scenes.map((item) => item.content).join(''),
    wordCount: scenes.reduce((sum, item) => sum + item.wordCount, 0),
    estimatedMinutes: scenes.length,
    scenes,
    sceneIds: scenes.map((item) => item.id),
  }
}

describe('semantic episode preview operations', () => {
  it('merges neighboring episodes without changing source coverage', () => {
    const episodes = [
      episode(5, [scene('s1', '甲\n'), scene('s2', '乙\n')]),
      episode(6, [scene('s3', '丙\n')]),
    ]

    const result = mergeEpisodeWithNext(episodes, 0)

    expect(result).toHaveLength(1)
    expect(result[0].number).toBe(5)
    expect(result[0].sceneIds).toEqual(['s1', 's2', 's3'])
    expect(result[0].content).toBe('甲\n乙\n丙\n')
  })

  it('splits only after an existing scene and preserves numbering offset', () => {
    const episodes = [
      episode(5, [scene('s1', '甲'), scene('s2', '乙'), scene('s3', '丙')]),
    ]

    const result = splitEpisodeAfterScene(episodes, 0, 's1')

    expect(result.map((item) => item.number)).toEqual([5, 6])
    expect(result.map((item) => item.sceneIds)).toEqual([['s1'], ['s2', 's3']])
    expect(result.map((item) => item.content).join('')).toBe('甲乙丙')
  })

  it('moves whole boundary scenes in both directions', () => {
    const initial = [
      episode(5, [scene('s1', '甲'), scene('s2', '乙')]),
      episode(6, [scene('s3', '丙'), scene('s4', '丁')]),
    ]

    const movedRight = moveLastSceneToNextEpisode(initial, 0)
    expect(movedRight.map((item) => item.sceneIds)).toEqual([['s1'], ['s2', 's3', 's4']])
    expect(movedRight.map((item) => item.content).join('')).toBe('甲乙丙丁')

    const movedLeft = moveFirstSceneToPreviousEpisode(movedRight, 1)
    expect(movedLeft.map((item) => item.sceneIds)).toEqual([['s1', 's2'], ['s3', 's4']])
    expect(movedLeft.map((item) => item.content).join('')).toBe('甲乙丙丁')
  })

  it('rejects splits or moves that would create an empty episode', () => {
    const episodes = [
      episode(1, [scene('s1', '甲')]),
      episode(2, [scene('s2', '乙')]),
    ]

    expect(splitEpisodeAfterScene(episodes, 0, 's1')).toBe(episodes)
    expect(moveLastSceneToNextEpisode(episodes, 0)).toBe(episodes)
    expect(moveFirstSceneToPreviousEpisode(episodes, 1)).toBe(episodes)
  })
})
