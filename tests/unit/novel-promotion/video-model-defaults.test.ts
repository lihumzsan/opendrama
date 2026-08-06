import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VIDEO_MODEL_KEY,
  LEGACY_LTX23_VIDEO_MODEL_KEYS,
  normalizeDefaultVideoModel,
  normalizeVideoModelKey,
  resolveDefaultFirstLastFrameVideoModel,
} from '@/lib/novel-promotion/video-model-defaults'

describe('video model defaults', () => {
  const SMART_VBVR_MODEL_KEY = 'comfyui::basevideo/ltx23-profiles/t8-smart-vbvr-390k-v2'
  const LEGACY_FIRST_LAST_MODEL_KEY = 'comfyui::basevideo/ltx23-profiles/t8-smooth-first-last-frame'
  const GOON_FIRST_LAST_MODEL_KEY = 'comfyui::basevideo/ltx23-profiles/goon-first-last-frame-2stage'
  const T8_MIGRATION_MODEL_KEY = 'comfyui::basevideo/ltx23-profiles/t8-multishot-precise-promptrelay-kj-720p'

  it('uses the H3 image-to-video workflow as the default video model', () => {
    expect(DEFAULT_VIDEO_MODEL_KEY).toBe('comfyui::basevideo/minimax-h3/h3-i2va')
    expect(normalizeDefaultVideoModel(null)).toBe(DEFAULT_VIDEO_MODEL_KEY)
    expect(normalizeDefaultVideoModel('')).toBe(DEFAULT_VIDEO_MODEL_KEY)
  })

  it('prefers H3 first-last-frame video when the mode is available', () => {
    expect(resolveDefaultFirstLastFrameVideoModel([
      GOON_FIRST_LAST_MODEL_KEY,
      'comfyui::basevideo/minimax-h3/h3-fl2va',
    ])).toBe('comfyui::basevideo/minimax-h3/h3-fl2va')
    expect(resolveDefaultFirstLastFrameVideoModel([GOON_FIRST_LAST_MODEL_KEY])).toBe(GOON_FIRST_LAST_MODEL_KEY)
  })

  it('preserves the current Smart VBVR LTX2.3 workflow key', () => {
    expect(LEGACY_LTX23_VIDEO_MODEL_KEYS).not.toContain(SMART_VBVR_MODEL_KEY)
    expect(normalizeVideoModelKey(SMART_VBVR_MODEL_KEY)).toBe(SMART_VBVR_MODEL_KEY)
    expect(normalizeVideoModelKey(SMART_VBVR_MODEL_KEY.replace('comfyui::', ''))).toBe(
      SMART_VBVR_MODEL_KEY.replace('comfyui::', ''),
    )
  })

  it('normalizes removed video workflow keys to the T8 default', () => {
    for (const legacyKey of LEGACY_LTX23_VIDEO_MODEL_KEYS) {
      expect(normalizeVideoModelKey(legacyKey)).toBe(T8_MIGRATION_MODEL_KEY)
      expect(normalizeVideoModelKey(legacyKey.replace('comfyui::', ''))).toBe(T8_MIGRATION_MODEL_KEY)
    }
  })

  it('preserves the removed smooth first-last-frame key for submission-time rejection', () => {
    expect(LEGACY_LTX23_VIDEO_MODEL_KEYS).not.toContain(LEGACY_FIRST_LAST_MODEL_KEY)
    expect(normalizeVideoModelKey(LEGACY_FIRST_LAST_MODEL_KEY)).toBe(LEGACY_FIRST_LAST_MODEL_KEY)
    expect(normalizeVideoModelKey(LEGACY_FIRST_LAST_MODEL_KEY.replace('comfyui::', ''))).toBe(
      LEGACY_FIRST_LAST_MODEL_KEY.replace('comfyui::', ''),
    )
  })

  it('migrates removed Bernini workflow keys to the T8 default', () => {
    expect(normalizeVideoModelKey('comfyui::basevideo/seedance2/bernini-480p-i2v')).toBe(T8_MIGRATION_MODEL_KEY)
    expect(normalizeVideoModelKey('basevideo/seedance2/bernini-480p-i2v')).toBe(T8_MIGRATION_MODEL_KEY)
    expect(normalizeVideoModelKey('comfyui::basevideo/seedance2/bernini-480p-i2v-audio-lipsync')).toBe(T8_MIGRATION_MODEL_KEY)
    expect(normalizeVideoModelKey('basevideo/seedance2/bernini-480p-i2v-audio-lipsync')).toBe(T8_MIGRATION_MODEL_KEY)
  })

  it('keeps explicit non-legacy video model selections', () => {
    expect(normalizeVideoModelKey('ark::doubao-seedance-2-0-260128')).toBe('ark::doubao-seedance-2-0-260128')
  })
})
