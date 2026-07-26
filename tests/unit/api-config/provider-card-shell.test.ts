import React from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { getCompatibilityLayerBadgeLabel } from '@/app/[locale]/profile/components/api-config/provider-card/ProviderCardShell'
import { ProviderBaseFields } from '@/app/[locale]/profile/components/api-config/provider-card/ProviderBaseFields'
import { buildProviderConnectionPayload } from '@/app/[locale]/profile/components/api-config/provider-card/hooks/useProviderCardState'
import type { UseProviderCardStateResult } from '@/app/[locale]/profile/components/api-config/provider-card/hooks/useProviderCardState'

vi.mock('@/components/ui/icons', () => ({
  AppIcon: () => null,
}))

describe('provider card shell compatibility layer badge', () => {
  const t = (key: string): string => {
    if (key === 'compatibilityLayerOpenAI') return 'OpenAI 兼容层'
    if (key === 'compatibilityLayerGemini') return 'Gemini 兼容层'
    return key
  }

  it('shows OpenAI compatible layer label for openai-compatible providers', () => {
    expect(getCompatibilityLayerBadgeLabel('openai-compatible:oa-1', t)).toBe('OpenAI 兼容层')
  })

  it('shows Gemini compatible layer label for gemini-compatible providers', () => {
    expect(getCompatibilityLayerBadgeLabel('gemini-compatible:gm-1', t)).toBe('Gemini 兼容层')
  })

  it('does not show compatibility label for preset providers', () => {
    expect(getCompatibilityLayerBadgeLabel('google', t)).toBeNull()
    expect(getCompatibilityLayerBadgeLabel('ark', t)).toBeNull()
    expect(getCompatibilityLayerBadgeLabel('bailian', t)).toBeNull()
    expect(getCompatibilityLayerBadgeLabel('siliconflow', t)).toBeNull()
  })

  it('shows the recommended automatic mode instead of a Windows path for Codex', () => {
    let renderer: ReactTestRenderer
    act(() => {
      renderer = create(React.createElement(ProviderBaseFields, {
        provider: {
          id: 'codex',
          name: 'Codex (Local)',
          hasApiKey: true,
        },
        t: (key: string) => ({
          cliPath: 'CLI Path',
          codexAutoDetect: 'Auto-detect (recommended)',
        })[key] || key,
        state: {
          providerKey: 'codex',
          isEditing: false,
          isEditingUrl: false,
          keyTestStatus: 'idle',
          keyTestSteps: [],
          showBaseUrlEdit: true,
          tempUrl: '',
          tempExecutablePath: '',
          maskedKey: '',
          showKey: false,
          setShowKey: () => undefined,
          startEditKey: () => undefined,
          startEditUrl: () => undefined,
          handleSaveUrl: () => undefined,
          handleCancelUrlEdit: () => undefined,
        } as unknown as UseProviderCardStateResult,
      }))
    })

    const rendered = JSON.stringify(renderer!.toJSON())
    expect(rendered).toContain('CLI Path')
    expect(rendered).toContain('Auto-detect (recommended)')
    expect(rendered).not.toContain('%LOCALAPPDATA%')
  })

  it('builds a Codex test payload with executablePath and no baseUrl', () => {
    expect(buildProviderConnectionPayload({
      providerKey: 'codex',
      apiKey: '',
      executablePath: ' /custom/codex ',
      baseUrl: 'https://should-not-be-used.example',
      llmModel: 'gpt-5.5',
    })).toEqual({
      apiType: 'codex',
      apiKey: '',
      executablePath: '/custom/codex',
      llmModel: 'gpt-5.5',
    })
  })

  it('keeps an empty Codex executable path in automatic mode', () => {
    expect(buildProviderConnectionPayload({
      providerKey: 'codex',
      apiKey: '',
      executablePath: '   ',
    })).toEqual({
      apiType: 'codex',
      apiKey: '',
    })
  })
})
