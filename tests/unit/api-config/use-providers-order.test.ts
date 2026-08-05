import { describe, expect, it } from 'vitest'
import {
  applyCodexPresetDefaults,
  applyCodexTextPresetDefault,
  applyComfyUiPresetDefaults,
  mergeProvidersForDisplay,
} from '@/app/[locale]/profile/components/api-config/hooks'
import type { Provider } from '@/app/[locale]/profile/components/api-config/types'
import {
  CODEX_DEFAULT_IMAGE_MODEL_KEY,
  CODEX_DEFAULT_MODEL_KEY,
  CODEX_PROVIDER_KEY,
} from '@/lib/providers/codex/constants'

describe('useProviders provider order merge', () => {
  it('preserves saved providers order and appends missing presets at the end', () => {
    const presetProviders: Provider[] = [
      { id: 'ark', name: 'Volcengine Ark' },
      { id: 'google', name: 'Google AI Studio' },
      { id: 'bailian', name: 'Alibaba Bailian' },
    ]
    const savedProviders: Provider[] = [
      { id: 'google', name: 'Google Legacy Name', apiKey: 'google-key', hidden: true },
      { id: 'openai-compatible:oa-2', name: 'OpenAI B', baseUrl: 'https://oa-b.test', apiKey: 'oa-key' },
      { id: 'ark', name: 'Ark Legacy Name', apiKey: 'ark-key' },
    ]

    const merged = mergeProvidersForDisplay(savedProviders, presetProviders)

    expect(merged.map((provider) => provider.id)).toEqual([
      'google',
      'openai-compatible:oa-2',
      'ark',
      'bailian',
    ])
    expect(merged[0]?.hidden).toBe(true)
  })

  it('uses preset localized names for preset providers while keeping apiKey/baseUrl from saved data', () => {
    const presetProviders: Provider[] = [
      { id: 'google', name: 'Google AI Studio', baseUrl: 'https://google.default' },
    ]
    const savedProviders: Provider[] = [
      { id: 'google', name: 'Google Old Name', baseUrl: 'https://google.custom', apiKey: 'google-key' },
    ]

    const merged = mergeProvidersForDisplay(savedProviders, presetProviders)

    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      id: 'google',
      name: 'Google AI Studio',
      baseUrl: 'https://google.custom',
      apiKey: 'google-key',
      hasApiKey: true,
    })
  })

  it('uses preset official baseUrl for minimax even when saved payload contains a custom baseUrl', () => {
    const presetProviders: Provider[] = [
      { id: 'minimax', name: 'MiniMax Hailuo', baseUrl: 'https://api.minimaxi.com/v1' },
    ]
    const savedProviders: Provider[] = [
      { id: 'minimax', name: 'MiniMax Legacy', baseUrl: 'https://custom.minimax.proxy/v1', apiKey: 'mm-key' },
    ]

    const merged = mergeProvidersForDisplay(savedProviders, presetProviders)

    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      id: 'minimax',
      name: 'MiniMax Hailuo',
      baseUrl: 'https://api.minimaxi.com/v1',
      apiKey: 'mm-key',
      hasApiKey: true,
    })
  })

  it('treats comfyui as ready when a baseUrl is available even without an apiKey', () => {
    const presetProviders: Provider[] = [
      { id: 'comfyui', name: 'ComfyUI (Local)', baseUrl: 'http://127.0.0.1:8188' },
    ]
    const savedProviders: Provider[] = [
      { id: 'comfyui', name: 'ComfyUI (Local)', baseUrl: 'http://127.0.0.1:8188', apiKey: '' },
    ]

    const merged = mergeProvidersForDisplay(savedProviders, presetProviders)

    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      id: 'comfyui',
      baseUrl: 'http://127.0.0.1:8188',
      hasApiKey: true,
    })
  })

  it('treats codex as ready without an api key', () => {
    const presetProviders: Provider[] = [
      { id: CODEX_PROVIDER_KEY, name: 'Codex (Local)' },
    ]
    const savedProviders: Provider[] = [
      { id: CODEX_PROVIDER_KEY, name: 'Codex (Local)', executablePath: '/custom/codex', apiKey: '' },
    ]

    const merged = mergeProvidersForDisplay(savedProviders, presetProviders)

    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      id: CODEX_PROVIDER_KEY,
      executablePath: '/custom/codex',
      hasApiKey: true,
    })
    expect(merged[0]?.baseUrl).toBeUndefined()
  })

  it('auto-selects codex for analysis only on the migration pass', () => {
    const result = applyCodexTextPresetDefault({
      models: [{
        modelId: 'gpt-5.5',
        modelKey: CODEX_DEFAULT_MODEL_KEY,
        name: 'Codex GPT-5.5',
        type: 'llm',
        provider: CODEX_PROVIDER_KEY,
        price: 0,
        enabled: false,
      }],
      defaultModels: { analysisModel: 'openrouter::openai/gpt-5.4' },
      shouldAutoSelect: true,
    })

    expect(result.changed).toBe(true)
    expect(result.defaultModels.analysisModel).toBe(CODEX_DEFAULT_MODEL_KEY)
    expect(result.models[0]?.enabled).toBe(true)

    const skipped = applyCodexTextPresetDefault({
      models: result.models,
      defaultModels: { analysisModel: 'openrouter::openai/gpt-5.4' },
      shouldAutoSelect: false,
    })
    expect(skipped.changed).toBe(false)
    expect(skipped.defaultModels.analysisModel).toBe('openrouter::openai/gpt-5.4')
  })

  it('migrates image generation defaults from ComfyUI workflows to Codex Image', () => {
    const result = applyCodexPresetDefaults({
      models: [
        {
          modelId: 'gpt-image-2',
          modelKey: CODEX_DEFAULT_IMAGE_MODEL_KEY,
          name: 'Codex Image',
          type: 'image',
          provider: CODEX_PROVIDER_KEY,
          price: 0,
          enabled: false,
        },
      ],
      defaultModels: {
        characterModel: 'comfyui::baseimage/图片生成/Flux2Klein文生图',
        locationModel: 'comfyui::baseimage/图片生成/ZImageTurbo造相',
        storyboardModel: 'comfyui::baseimage/图片分镜/Qwen剧情分镜制作',
        editModel: 'comfyui::baseimage/图片编辑/qwen单图编辑',
      },
      shouldAutoSelectText: false,
    })

    expect(result.changed).toBe(true)
    expect(result.defaultModels).toMatchObject({
      characterModel: CODEX_DEFAULT_IMAGE_MODEL_KEY,
      locationModel: CODEX_DEFAULT_IMAGE_MODEL_KEY,
      storyboardModel: CODEX_DEFAULT_IMAGE_MODEL_KEY,
      editModel: CODEX_DEFAULT_IMAGE_MODEL_KEY,
    })
    expect(result.models[0]?.enabled).toBe(true)
  })

  it('keeps an explicit non-ComfyUI image default when enabling Codex Image', () => {
    const result = applyCodexPresetDefaults({
      models: [
        {
          modelId: 'gpt-image-2',
          modelKey: CODEX_DEFAULT_IMAGE_MODEL_KEY,
          name: 'Codex Image',
          type: 'image',
          provider: CODEX_PROVIDER_KEY,
          price: 0,
          enabled: false,
        },
      ],
      defaultModels: {
        characterModel: 'fal::banana',
      },
      shouldAutoSelectText: false,
    })

    expect(result.defaultModels.characterModel).toBe('fal::banana')
    expect(result.defaultModels.locationModel).toBe(CODEX_DEFAULT_IMAGE_MODEL_KEY)
    expect(result.defaultModels.storyboardModel).toBe(CODEX_DEFAULT_IMAGE_MODEL_KEY)
    expect(result.defaultModels.editModel).toBe(CODEX_DEFAULT_IMAGE_MODEL_KEY)
    expect(result.models[0]?.enabled).toBe(true)
  })

  it('applies ComfyUI fallback defaults only for supported video and audio workflows', () => {
    const result = applyComfyUiPresetDefaults({
      models: [
        {
          modelId: 'basevideo/minimax-h3/h3-i2va',
          modelKey: 'comfyui::basevideo/minimax-h3/h3-i2va',
          name: 'ComfyUI · MiniMax H3 Image to Video with Audio',
          type: 'video',
          provider: 'comfyui',
          price: 0,
          enabled: false,
        },
        {
          modelId: 'baseaudio/单人/LongCat-one',
          modelKey: 'comfyui::baseaudio/单人/LongCat-one',
          name: 'ComfyUI · LongCat single',
          type: 'audio',
          provider: 'comfyui',
          price: 0,
          enabled: false,
        },
        {
          modelId: 'baseaudio/\u97f3\u8272/s2-se',
          modelKey: 'comfyui::baseaudio/\u97f3\u8272/s2-se',
          name: 'ComfyUI · S2 voice design',
          type: 'audio',
          provider: 'comfyui',
          price: 0,
          enabled: false,
        },
      ],
      defaultModels: {},
    })

    expect(result.changed).toBe(true)
    expect(result.defaultModels).toMatchObject({
      videoModel: 'comfyui::basevideo/minimax-h3/h3-i2va',
      audioModel: 'comfyui::baseaudio/单人/LongCat-one',
      voiceDesignModel: 'comfyui::baseaudio/\u97f3\u8272/s2-se',
    })
    const enabledByKey = new Map(result.models.map((model) => [model.modelKey, model.enabled]))
    expect(enabledByKey.get('comfyui::basevideo/minimax-h3/h3-i2va')).toBe(true)
  })

  it('does not overwrite an existing explicit image default model selection', () => {
    const result = applyComfyUiPresetDefaults({
      models: [
        {
          modelId: 'custom-image-model',
          modelKey: 'custom::image-model',
          name: 'Custom Image Model',
          type: 'image',
          provider: 'custom',
          price: 0,
          enabled: true,
        },
      ],
      defaultModels: {
        characterModel: 'custom::image-model',
      },
    })

    expect(result.defaultModels.characterModel).toBe('custom::image-model')
  })

  it('does not overwrite an existing explicit audio default model selection', () => {
    const result = applyComfyUiPresetDefaults({
      models: [
        {
          modelId: 'custom-audio-model',
          modelKey: 'custom::audio-model',
          name: 'Custom Audio Model',
          type: 'audio',
          provider: 'custom',
          price: 0,
          enabled: true,
        },
        {
          modelId: 'baseaudio/单人/LongCat-one',
          modelKey: 'comfyui::baseaudio/单人/LongCat-one',
          name: 'ComfyUI · LongCat single',
          type: 'audio',
          provider: 'comfyui',
          price: 0,
          enabled: false,
        },
      ],
      defaultModels: {
        audioModel: 'custom::audio-model',
      },
    })

    expect(result.defaultModels.audioModel).toBe('custom::audio-model')
    expect(result.models[1]?.enabled).toBe(true)
  })
})
