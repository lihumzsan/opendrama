import { describe, expect, it } from 'vitest'
import type { CapabilitySelections, ModelCapabilities } from '@/lib/model-config-contract'
import { resolveGenerationOptionsForModel } from '@/lib/model-capabilities/lookup'
import {
  normalizeVideoGenerationSelections,
  resolveEffectiveVideoCapabilityDefinitions,
} from '@/lib/model-capabilities/video-effective'

describe('model-capabilities/lookup - video singleton defaults', () => {
  const modelKey = 'comfyui::basevideo/ltx23-profiles/t8-multishot-precise-promptrelay-kj-720p'
  const capabilities: ModelCapabilities = {
    video: {
      generationModeOptions: ['normal'],
      durationOptions: [4, 5, 6, 8, 10, 12, 16, 20],
      fpsOptions: [25],
      resolutionOptions: ['720p'],
      motionStrengthOptions: [1, 2, 3],
    },
  }

  it('auto-fills missing singleton video fields while preserving configured choices', () => {
    const capabilityOverrides: CapabilitySelections = {
      [modelKey]: {
        generationMode: 'normal',
        duration: 10,
        resolution: '720p',
        motionStrength: 2,
      },
    }

    const result = resolveGenerationOptionsForModel({
      modelType: 'video',
      modelKey,
      capabilities,
      capabilityOverrides,
      requireAllFields: true,
    })

    expect(result.issues).toEqual([])
    expect(result.options).toEqual({
      generationMode: 'normal',
      duration: 10,
      fps: 25,
      resolution: '720p',
      motionStrength: 2,
    })
  })

  it('uses the first motion strength option as the UI default', () => {
    const definitions = resolveEffectiveVideoCapabilityDefinitions({
      videoCapabilities: capabilities.video,
    })
    const result = normalizeVideoGenerationSelections({ definitions })

    expect(result.motionStrength).toBe(1)
  })
})
