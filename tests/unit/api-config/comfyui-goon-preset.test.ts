import { describe, expect, it } from 'vitest'
import { PRESET_MODELS } from '@/app/[locale]/profile/components/api-config/types'

describe('ComfyUI video settings helpers', () => {
  it('does not expose non-H3 ComfyUI video workflows in preset models', () => {
    const comfyUiVideoModelIds = PRESET_MODELS
      .filter((model) => model.provider === 'comfyui' && model.type === 'video')
      .map((model) => model.modelId)

    expect(comfyUiVideoModelIds).toEqual([
      'basevideo/minimax-h3/h3-i2va',
      'basevideo/minimax-h3/h3-fl2va',
    ])
    expect(comfyUiVideoModelIds).not.toContain('basevideo/ltx23-profiles/goon-first-last-frame-2stage')
    expect(comfyUiVideoModelIds).not.toContain('basevideo/h3/fl2va-first-frame')
    expect(comfyUiVideoModelIds).not.toContain('basevideo/h3/fl2va-first-last-frame')
    expect(comfyUiVideoModelIds).not.toContain('basevideo/ltx23-profiles/t8-smooth-first-last-frame')
  })
})
