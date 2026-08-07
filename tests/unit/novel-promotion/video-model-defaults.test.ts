import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FIRST_LAST_FRAME_VIDEO_MODEL_KEY,
  DEFAULT_VIDEO_MODEL_KEY,
  normalizeDefaultVideoModel,
  normalizeVideoModelKey,
  resolveDefaultFirstLastFrameVideoModel,
} from '@/lib/novel-promotion/video-model-defaults'

describe('video model defaults', () => {
  it('uses H3 image-to-video as the default video model', () => {
    expect(DEFAULT_VIDEO_MODEL_KEY).toBe('comfyui::basevideo/minimax-h3/h3-i2va')
    expect(normalizeDefaultVideoModel(null)).toBe(DEFAULT_VIDEO_MODEL_KEY)
    expect(normalizeDefaultVideoModel('')).toBe(DEFAULT_VIDEO_MODEL_KEY)
  })

  it('uses H3 first-last-frame as the first-last-frame default', () => {
    expect(DEFAULT_FIRST_LAST_FRAME_VIDEO_MODEL_KEY).toBe('comfyui::basevideo/minimax-h3/h3-fl2va')
    expect(resolveDefaultFirstLastFrameVideoModel([
      'comfyui::basevideo/minimax-h3/h3-i2va',
      DEFAULT_FIRST_LAST_FRAME_VIDEO_MODEL_KEY,
    ])).toBe(DEFAULT_FIRST_LAST_FRAME_VIDEO_MODEL_KEY)
  })

  it('only normalizes whitespace and path separators', () => {
    expect(normalizeVideoModelKey(' comfyui::basevideo\\minimax-h3\\h3-i2va ')).toBe(
      'comfyui::basevideo/minimax-h3/h3-i2va',
    )
    expect(normalizeVideoModelKey('ark::doubao-seedance-2-0-260128')).toBe('ark::doubao-seedance-2-0-260128')
  })
})
