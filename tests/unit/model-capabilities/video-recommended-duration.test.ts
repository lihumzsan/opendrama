import { describe, expect, it } from 'vitest'
import {
  applyRecommendedVideoDurationSelection,
  normalizeRecommendedVideoDuration,
  supportsRecommendedVideoDuration,
  withRecommendedVideoDuration,
} from '@/lib/model-capabilities/video-recommended-duration'

const definitions = [{ field: 'duration', options: [5, 10], fieldI18n: null }]
const kjPromptRelay = 'comfyui::basevideo/ltx23-profiles/t8-multishot-precise-promptrelay-kj-720p'
const h3I2va = 'comfyui::basevideo/minimax-h3/h3-i2va'

describe('video recommended duration', () => {
  it('prepends a valid card duration and removes duplicates', () => {
    expect(withRecommendedVideoDuration(definitions, {
      modelKey: kjPromptRelay,
      recommendedDuration: 9,
    })[0].options).toEqual([9, 5, 10])

    expect(withRecommendedVideoDuration(definitions, {
      modelKey: kjPromptRelay,
      recommendedDuration: 10,
    })[0].options).toEqual([10, 5])

    expect(withRecommendedVideoDuration(definitions, {
      modelKey: kjPromptRelay,
      recommendedDuration: 9,
    })[0].options).toEqual([9, 5, 10])
  })

  it.each([undefined, null, '', 0, -2, 'nope'])(
    'preserves current options for invalid recommendation %s',
    (value) => {
      expect(withRecommendedVideoDuration(definitions, {
        modelKey: kjPromptRelay,
        recommendedDuration: value,
      })).toEqual(definitions)
    },
  )

  it('does not add custom seconds to an unsupported workflow', () => {
    expect(withRecommendedVideoDuration(definitions, {
      modelKey: 'comfyui::other',
      recommendedDuration: 9,
    })).toEqual(definitions)
  })

  it('supports H3 storyboard recommendations and clamps legacy short durations', () => {
    expect(supportsRecommendedVideoDuration(h3I2va)).toBe(true)
    expect(withRecommendedVideoDuration(definitions, {
      modelKey: h3I2va,
      recommendedDuration: 7,
    })[0].options).toEqual([7, 5, 10])
    expect(withRecommendedVideoDuration(definitions, {
      modelKey: h3I2va,
      recommendedDuration: 3,
    })[0].options).toEqual([5, 10])
    expect(applyRecommendedVideoDurationSelection(
      { duration: 10 },
      { modelKey: h3I2va, recommendedDuration: 3 },
    )).toEqual({ duration: 5 })
  })

  it('normalizes numeric strings and rejects non-positive values', () => {
    expect(normalizeRecommendedVideoDuration('9')).toBe(9)
    expect(normalizeRecommendedVideoDuration(0)).toBeNull()
  })

  it('replaces only the default duration selection for PromptRelay', () => {
    expect(applyRecommendedVideoDurationSelection(
      { duration: 5, motionStrength: 2 },
      { modelKey: kjPromptRelay, recommendedDuration: 9 },
    )).toEqual({ duration: 9, motionStrength: 2 })
    expect(applyRecommendedVideoDurationSelection(
      { duration: 5, motionStrength: 2 },
      { modelKey: kjPromptRelay, recommendedDuration: undefined },
    )).toEqual({ duration: 5, motionStrength: 2 })
    expect(applyRecommendedVideoDurationSelection(
      { duration: 4, motionStrength: 1 },
      { modelKey: kjPromptRelay, recommendedDuration: 9 },
    )).toEqual({ duration: 9, motionStrength: 1 })
  })

})
