import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_COMFYUI_BASE_URL, resolveComfyUiBaseUrl } from '@/lib/api-config'

describe('ComfyUI base URL defaults', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses COMFYUI_BASE_URL when configured', () => {
    vi.stubEnv('COMFYUI_BASE_URL', ' http://10.0.0.8:8878/ ')

    expect(resolveComfyUiBaseUrl('http://192.168.0.112:8878')).toBe('http://10.0.0.8:8878/')
  })

  it('uses the saved provider value when the env value is missing', () => {
    vi.stubEnv('COMFYUI_BASE_URL', '')

    expect(resolveComfyUiBaseUrl('http://10.0.0.9:8878')).toBe('http://10.0.0.9:8878')
  })

  it('falls back to the shared local default when no config value is present', () => {
    vi.stubEnv('COMFYUI_BASE_URL', '')

    expect(resolveComfyUiBaseUrl()).toBe(DEFAULT_COMFYUI_BASE_URL)
  })
})
