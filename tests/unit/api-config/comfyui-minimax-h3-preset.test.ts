import { describe, expect, it } from 'vitest'
import { PRESET_MODELS } from '@/app/[locale]/profile/components/api-config/types'

describe('ComfyUI MiniMax H3 settings helpers', () => {
  it('does not expose retired ComfyUI image workflows as selectable presets', () => {
    expect(PRESET_MODELS.some((model) => model.provider === 'comfyui' && model.type === 'image')).toBe(false)
  })

  it('exposes both H3 workflow modes as selectable ComfyUI video presets', () => {
    const modelIds = PRESET_MODELS
      .filter((model) => model.provider === 'comfyui' && model.type === 'video')
      .map((model) => model.modelId)

    expect(modelIds).toContain('basevideo/minimax-h3/h3-i2va')
    expect(modelIds).toContain('basevideo/minimax-h3/h3-fl2va')
  })
})
