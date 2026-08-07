import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockRequest } from '../../../helpers/request'

const authMock = vi.hoisted(() => ({
  requireUserAuth: vi.fn(async () => ({
    session: { user: { id: 'user-1' } },
  })),
  isErrorResponse: vi.fn((value: unknown) => value instanceof Response),
}))

const prismaMock = vi.hoisted(() => ({
  userPreference: {
    findUnique: vi.fn(async () => ({
      customModels: JSON.stringify([
        {
          modelId: 'basevideo/demo/LTX2.3-fast',
          modelKey: 'comfyui::basevideo/demo/LTX2.3-fast',
          name: 'Old LTX2.3',
          type: 'video',
          provider: 'comfyui',
        },
        {
          modelId: 'basevideo/ltx23-profiles/t8-smooth-first-last-frame',
          modelKey: 'comfyui::basevideo/ltx23-profiles/t8-smooth-first-last-frame',
          name: 'Old smooth first/last frame',
          type: 'video',
          provider: 'comfyui',
        },
      ]),
      customProviders: JSON.stringify([
        {
          id: 'comfyui',
          name: 'ComfyUI (Local)',
          baseUrl: 'http://127.0.0.1:8188',
        },
      ]),
    })),
  },
}))

vi.mock('@/lib/api-auth', () => authMock)
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/model-capabilities/catalog', () => ({
  findBuiltinCapabilities: vi.fn(() => undefined),
}))
vi.mock('@/lib/model-pricing/catalog', () => ({
  findBuiltinPricingCatalogEntry: vi.fn(() => undefined),
}))

describe('api specific - user models ComfyUI video filter', () => {
  const routeContext = { params: Promise.resolve({}) }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides non-H3 ComfyUI video models and keeps only H3 helpers', async () => {
    const mod = await import('@/app/api/user/models/route')
    const req = buildMockRequest({
      path: '/api/user/models',
      method: 'GET',
    })
    const res = await mod.GET(req, routeContext)

    expect(res.status).toBe(200)
    const body = await res.json() as {
      video: Array<{ value: string; label: string }>
    }
    const values = body.video.map((item) => item.value)

    expect(values).not.toContain('comfyui::basevideo/demo/LTX2.3-fast')
    expect(values).not.toContain('comfyui::basevideo/ltx23-profiles/t8-smooth-first-last-frame')
    expect(values).not.toContain('comfyui::basevideo/ltx23-profiles/goon-first-last-frame-2stage')
    expect(values).not.toContain('comfyui::basevideo/ltx23-profiles/t8-smart-vbvr-390k-v2')
    expect(values).not.toContain('comfyui::basevideo/ltx23-profiles/t8-multishot-precise-promptrelay-kj-720p')
    expect(values).not.toContain('comfyui::basevideo/seedance2/bernini-480p-i2v')
    expect(values).toEqual([
      'comfyui::basevideo/minimax-h3/h3-i2va',
      'comfyui::basevideo/minimax-h3/h3-fl2va',
    ])
    expect(body.video.find((item) => item.value.endsWith('h3-i2va'))?.label)
      .toBe('ComfyUI · MiniMax H3 Image to Video with Audio')
    expect(body.video.find((item) => item.value.endsWith('h3-fl2va'))?.label)
      .toBe('ComfyUI · MiniMax H3 First/Last Frame with Audio')
  })
})
