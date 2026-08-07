import { describe, expect, it } from 'vitest'
import { findBuiltinCapabilities } from '@/lib/model-capabilities/catalog'

describe('comfyui video capabilities catalog', () => {
  it('does not register the retired Goon first-last-frame workflow', () => {
    const capabilities = findBuiltinCapabilities(
      'video',
      'comfyui',
      'basevideo/ltx23-profiles/goon-first-last-frame-2stage',
    )

    expect(capabilities).toBeUndefined()
  })

  it('does not register the removed Smart VBVR LTX 2.3 workflow', () => {
    const capabilities = findBuiltinCapabilities(
      'video',
      'comfyui',
      'basevideo/ltx23-profiles/t8-smart-vbvr-390k-v2',
    )

    expect(capabilities).toBeUndefined()
  })

  it('registers separate H3 I2VA and FL2VA capabilities as the only ComfyUI video defaults', () => {
    const i2va = findBuiltinCapabilities(
      'video',
      'comfyui',
      'basevideo/minimax-h3/h3-i2va',
    )
    const fl2va = findBuiltinCapabilities(
      'video',
      'comfyui',
      'basevideo/minimax-h3/h3-fl2va',
    )

    expect(i2va?.video).toMatchObject({
      generationModeOptions: ['normal'],
      durationOptions: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      fpsOptions: [24],
      resolutionOptions: ['768P'],
      firstlastframe: false,
      supportGenerateAudio: true,
    })
    expect(fl2va?.video).toMatchObject({
      generationModeOptions: ['firstlastframe'],
      durationOptions: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      fpsOptions: [24],
      resolutionOptions: ['768P'],
      firstlastframe: true,
      supportGenerateAudio: true,
    })
  })

  it('does not register the retired KJ multi-shot PromptRelay workflow', () => {
    const capabilities = findBuiltinCapabilities(
      'video',
      'comfyui',
      'basevideo/ltx23-profiles/t8-multishot-precise-promptrelay-kj-720p',
    )

    expect(capabilities).toBeUndefined()
  })

  it('does not register the removed local MiniMax H3 first-frame workflow', () => {
    const capabilities = findBuiltinCapabilities(
      'video',
      'comfyui',
      'basevideo/h3/fl2va-first-frame',
    )

    expect(capabilities).toBeUndefined()
  })

  it('does not register the removed local MiniMax H3 first-last-frame workflow', () => {
    const capabilities = findBuiltinCapabilities(
      'video',
      'comfyui',
      'basevideo/h3/fl2va-first-last-frame',
    )

    expect(capabilities).toBeUndefined()
  })
})
