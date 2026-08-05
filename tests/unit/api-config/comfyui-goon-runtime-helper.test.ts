import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  userPreference: {
    findUnique: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

import { resolveModelSelection } from '@/lib/api-config'

const GOON_MODEL_KEY = 'comfyui::basevideo/ltx23-profiles/goon-first-last-frame-2stage'
const KJ_MULTISHOT_MODEL_KEY = 'comfyui::basevideo/ltx23-profiles/t8-multishot-precise-promptrelay-kj-720p'
const H3_FIRST_FRAME_MODEL_KEY = 'comfyui::basevideo/h3/fl2va-first-frame'
const H3_FIRST_LAST_FRAME_MODEL_KEY = 'comfyui::basevideo/h3/fl2va-first-last-frame'
const REMOTE_H3_FIRST_LAST_FRAME_MODEL_KEY = 'comfyui::basevideo/minimax-h3/h3-fl2va'
const SMART_VBVR_MODEL_KEY = 'comfyui::basevideo/ltx23-profiles/t8-smart-vbvr-390k-v2'
const WAN_REMIX_MODEL_KEY = 'comfyui::basevideo/demo/Wan2.2Remix'

describe('ComfyUI Goon runtime helper model', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.userPreference.findUnique.mockResolvedValue({
      customModels: '[]',
      customProviders: JSON.stringify([
        {
          id: 'comfyui',
          name: 'ComfyUI',
          baseUrl: 'http://192.168.1.112:8188',
        },
      ]),
    })
  })

  it('resolves the auto-enabled Goon workflow for video execution', async () => {
    await expect(
      resolveModelSelection('user-1', GOON_MODEL_KEY, 'video'),
    ).resolves.toMatchObject({
      provider: 'comfyui',
      modelId: 'basevideo/ltx23-profiles/goon-first-last-frame-2stage',
      modelKey: GOON_MODEL_KEY,
      mediaType: 'video',
    })
  })

  it('resolves the auto-enabled KJ multi-shot workflow for video execution', async () => {
    await expect(
      resolveModelSelection('user-1', KJ_MULTISHOT_MODEL_KEY, 'video'),
    ).resolves.toMatchObject({
      provider: 'comfyui',
      modelId: 'basevideo/ltx23-profiles/t8-multishot-precise-promptrelay-kj-720p',
      modelKey: KJ_MULTISHOT_MODEL_KEY,
      mediaType: 'video',
    })
  })

  it('resolves the retained remote MiniMax H3 first-last-frame workflow', async () => {
    await expect(
      resolveModelSelection('user-1', REMOTE_H3_FIRST_LAST_FRAME_MODEL_KEY, 'video'),
    ).resolves.toMatchObject({
      provider: 'comfyui',
      modelId: 'basevideo/minimax-h3/h3-fl2va',
      modelKey: REMOTE_H3_FIRST_LAST_FRAME_MODEL_KEY,
      mediaType: 'video',
    })
  })

  it.each([
    H3_FIRST_FRAME_MODEL_KEY,
    H3_FIRST_LAST_FRAME_MODEL_KEY,
    SMART_VBVR_MODEL_KEY,
    WAN_REMIX_MODEL_KEY,
  ])('rejects removed ComfyUI video model %s at runtime', async (modelKey) => {
    await expect(resolveModelSelection('user-1', modelKey, 'video'))
      .rejects.toThrow(`MODEL_NOT_FOUND: ${modelKey} is not enabled for video`)
  })
})
