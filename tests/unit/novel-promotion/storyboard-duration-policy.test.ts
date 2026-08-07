import { describe, expect, it } from 'vitest'

import {
  normalizeStoryboardPanelDuration,
  resolveStoryboardDurationPolicy,
} from '@/lib/novel-promotion/storyboard-duration-policy'

describe('storyboard duration policy', () => {
  it('uses the H3 5-15 second range for both H3 workflows', () => {
    expect(resolveStoryboardDurationPolicy('comfyui::basevideo/minimax-h3/h3-i2va')).toEqual({
      minSeconds: 5,
      maxSeconds: 15,
    })
    expect(resolveStoryboardDurationPolicy('basevideo/minimax-h3/h3-fl2va')).toEqual({
      minSeconds: 5,
      maxSeconds: 15,
    })
  })

  it('does not apply the H3 policy to another video model', () => {
    expect(resolveStoryboardDurationPolicy('comfyui::basevideo/ltx23-profiles/t8-smart-vbvr-390k-v2')).toBeNull()
  })

  it('clamps invalid H3 panel durations to the supported boundaries', () => {
    const policy = resolveStoryboardDurationPolicy('comfyui::basevideo/minimax-h3/h3-i2va')

    expect(normalizeStoryboardPanelDuration(3, policy)).toBe(5)
    expect(normalizeStoryboardPanelDuration(12, policy)).toBe(12)
    expect(normalizeStoryboardPanelDuration(19, policy)).toBe(15)
    expect(normalizeStoryboardPanelDuration(undefined, policy)).toBeUndefined()
  })
})
