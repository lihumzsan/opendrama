import { describe, expect, it } from 'vitest'
import { PRESET_MODELS, PRESET_PROVIDERS } from '@/app/[locale]/profile/components/api-config/types'

describe('api-config minimax preset', () => {
  it('uses official minimax baseUrl in preset provider', () => {
    const minimaxProvider = PRESET_PROVIDERS.find((provider) => provider.id === 'minimax')
    expect(minimaxProvider).toBeDefined()
    expect(minimaxProvider?.baseUrl).toBe('https://api.minimaxi.com/v1')
  })

  it('does not expose minimax text models when text generation is restricted to Codex', () => {
    const minimaxLlmModelIds = PRESET_MODELS
      .filter((model) => model.provider === 'minimax' && model.type === 'llm')
      .map((model) => model.modelId)

    expect(minimaxLlmModelIds).toEqual([])
  })
})
