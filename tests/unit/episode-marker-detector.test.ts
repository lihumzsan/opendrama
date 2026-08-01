import { describe, expect, it } from 'vitest'
import {
  detectEpisodeMarkers,
  splitByMarkers,
} from '@/lib/episode-marker-detector'

describe('episode marker detector', () => {
  it('keeps explicitly marked long chapters intact', () => {
    const firstBody = '山'.repeat(430)
    const secondBody = '海'.repeat(430)
    const content = [
      '第一章 初遇',
      firstBody,
      '第二章 追问',
      secondBody,
    ].join('\n')

    const markerResult = detectEpisodeMarkers(content)

    expect(markerResult.hasMarkers).toBe(true)
    expect(markerResult.markerTypeKey).toBe('chapter')
    expect(markerResult.previewSplits).toHaveLength(2)
    expect(markerResult.previewSplits.every((split) => split.wordCount > 400)).toBe(true)

    const episodes = splitByMarkers(content, markerResult)
    expect(episodes).toHaveLength(2)
    expect(episodes.map((episode) => episode.content).join('')).toBe(content)
    expect(episodes.map((episode) => episode.number)).toEqual([1, 2])
  })
})
