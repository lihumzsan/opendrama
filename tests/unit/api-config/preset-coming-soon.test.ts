import { describe, expect, it } from 'vitest'
import {
  PRESET_MODELS,
  encodeModelKey,
  isPresetComingSoonModel,
  isPresetComingSoonModelKey,
} from '@/app/[locale]/profile/components/api-config/types'

describe('api-config preset coming soon', () => {
  it('registers Nano Banana 2 under Google AI Studio presets', () => {
    const model = PRESET_MODELS.find(
      (entry) => entry.provider === 'google' && entry.modelId === 'gemini-3.1-flash-image-preview',
    )
    expect(model).toBeDefined()
    expect(model?.name).toBe('Nano Banana 2')
  })

  it('does not expose Ark video presets when video generation is restricted to ComfyUI', () => {
    const modelIds = PRESET_MODELS
      .filter((entry) => entry.provider === 'ark' && entry.type === 'video')
      .map((entry) => entry.modelId)

    expect(modelIds).toEqual([])
  })

  it('keeps the supported MiniMax H3 preset available and non-coming-soon', () => {
    const modelKey = encodeModelKey('comfyui', 'basevideo/minimax-h3/h3-i2va')
    expect(PRESET_MODELS).toContainEqual(expect.objectContaining({
      provider: 'comfyui',
      modelId: 'basevideo/minimax-h3/h3-i2va',
      type: 'video',
    }))
    expect(isPresetComingSoonModel('comfyui', 'basevideo/minimax-h3/h3-i2va')).toBe(false)
    expect(isPresetComingSoonModelKey(modelKey)).toBe(false)
  })

  it('does not expose Bailian Wan video presets when video generation is restricted to ComfyUI', () => {
    const modelIds = PRESET_MODELS
      .filter((entry) => entry.provider === 'bailian' && entry.type === 'video')
      .map((entry) => entry.modelId)

    expect(modelIds).toEqual([])
  })
})
