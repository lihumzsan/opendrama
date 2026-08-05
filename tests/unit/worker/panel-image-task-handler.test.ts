import type { Job } from 'bullmq'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TASK_TYPE, type TaskJobData } from '@/lib/task/types'
import { CODEX_DEFAULT_IMAGE_MODEL_KEY } from '@/lib/providers/codex/constants'

const prismaMock = vi.hoisted(() => ({
  novelPromotionPanel: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(async () => ({})),
  },
  task: {
    update: vi.fn(async () => ({})),
  },
  mediaObject: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}))

const utilsMock = vi.hoisted(() => ({
  assertTaskActive: vi.fn(async () => undefined),
  getProjectModels: vi.fn(async () => ({
    storyboardModel: 'storyboard-model-1',
    analysisModel: 'analysis-model-1',
    artStyle: 'realistic',
    editModel: CODEX_DEFAULT_IMAGE_MODEL_KEY,
  })),
  resolveImageSourceFromGeneration: vi.fn(),
  toSignedUrlIfCos: vi.fn((value: string | null | undefined) =>
    typeof value === 'string' && value.trim() ? `signed:${value}` : null,
  ),
  uploadImageSourceToCos: vi.fn(),
  uploadImageSourceToCosWithMetadata: vi.fn(),
}))

const aiRuntimeMock = vi.hoisted(() => ({
  executeAiVisionStep: vi.fn(),
}))

const sharedMock = vi.hoisted(() => ({
  collectPanelReferenceImages: vi.fn(async () => ['https://signed.example/ref-1.png']),
  resolveNovelData: vi.fn(async () => ({
    videoRatio: '16:9',
    characters: [],
    locations: [
      {
        name: 'Old Town',
        images: [
          {
            isSelected: true,
            description: 'night street',
            availableSlots: JSON.stringify(['left-side empty area']),
          },
        ],
      },
    ],
  })),
}))

const outboundMock = vi.hoisted(() => ({
  normalizeReferenceImagesForGeneration: vi.fn(async (refs: string[]) =>
    refs.map((ref) => `normalized:${ref}`),
  ),
}))

const promptMock = vi.hoisted(() => ({
  buildPrompt: vi.fn(() => 'panel-image-prompt'),
}))

const apiConfigMock = vi.hoisted(() => ({
  getUserModels: vi.fn(async () => [
    { modelKey: 'storyboard-model-1', type: 'image' },
    { modelKey: CODEX_DEFAULT_IMAGE_MODEL_KEY, type: 'image' },
  ]),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/workers/utils', () => utilsMock)
vi.mock('@/lib/api-config', () => apiConfigMock)
vi.mock('@/lib/ai-runtime/client', () => aiRuntimeMock)
vi.mock('@/lib/media/outbound-image', () => outboundMock)
vi.mock('@/lib/workers/shared', () => ({ reportTaskProgress: vi.fn(async () => undefined) }))
vi.mock('@/lib/logging/core', () => ({
  logInfo: vi.fn(),
  createScopedLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    event: vi.fn(),
    child: vi.fn(),
  })),
}))
vi.mock('@/lib/workers/handlers/image-task-handler-shared', async () => {
  const actual = await vi.importActual<typeof import('@/lib/workers/handlers/image-task-handler-shared')>(
    '@/lib/workers/handlers/image-task-handler-shared',
  )
  return {
    ...actual,
    collectPanelReferenceImages: sharedMock.collectPanelReferenceImages,
    resolveNovelData: sharedMock.resolveNovelData,
  }
})
vi.mock('@/lib/prompt-i18n', () => ({
  PROMPT_IDS: { NP_SINGLE_PANEL_IMAGE: 'np_single_panel_image' },
  buildPrompt: promptMock.buildPrompt,
}))

import { handlePanelImageTask } from '@/lib/workers/handlers/panel-image-task-handler'

function buildJob(payload: Record<string, unknown>, targetId = 'panel-1'): Job<TaskJobData> {
  return {
    data: {
      taskId: 'task-panel-image-1',
      type: TASK_TYPE.IMAGE_PANEL,
      locale: 'zh',
      projectId: 'project-1',
      episodeId: 'episode-1',
      targetType: 'NovelPromotionPanel',
      targetId,
      payload,
      userId: 'user-1',
    },
  } as unknown as Job<TaskJobData>
}

function mockImageUploads(...keys: string[]) {
  utilsMock.uploadImageSourceToCos.mockReset()
  utilsMock.uploadImageSourceToCosWithMetadata.mockReset()
  for (const key of keys) {
    utilsMock.uploadImageSourceToCos.mockResolvedValueOnce(key)
    utilsMock.uploadImageSourceToCosWithMetadata.mockResolvedValueOnce({
      key,
      metadata: { mimeType: 'image/png', sizeBytes: 1024, width: 1280, height: 720 },
    })
  }
}

describe('worker panel-image-task-handler behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.novelPromotionPanel.findUnique.mockResolvedValue({
      id: 'panel-1',
      storyboardId: 'storyboard-1',
      panelIndex: 0,
      shotType: 'close-up',
      cameraMove: 'static',
      description: 'hero close-up',
      imagePrompt: 'panel anchor prompt',
      videoPrompt: 'dramatic',
      location: 'Old Town',
      characters: JSON.stringify([{ name: 'Hero', appearance: 'default', slot: 'left-side empty area' }]),
      srtSegment: 'dialogue segment',
      photographyRules: null,
      actingNotes: null,
      sketchImageUrl: 'images/sketch.png',
      imageUrl: null,
    })
    prismaMock.novelPromotionPanel.findFirst.mockResolvedValue(null)
    prismaMock.novelPromotionPanel.findMany.mockResolvedValue([])
    prismaMock.task.update.mockResolvedValue({})
    prismaMock.mediaObject.findUnique.mockResolvedValue(null)
    prismaMock.mediaObject.upsert.mockImplementation(async (args: {
      create: {
        publicId: string
        storageKey: string
        mimeType?: string | null
        sizeBytes?: bigint | number | null
        width?: number | null
        height?: number | null
        durationMs?: number | null
      }
    }) => ({
      id: `media:${args.create.storageKey}`,
      publicId: args.create.publicId,
      storageKey: args.create.storageKey,
      sha256: null,
      mimeType: args.create.mimeType ?? null,
      sizeBytes: args.create.sizeBytes ?? null,
      width: args.create.width ?? null,
      height: args.create.height ?? null,
      durationMs: args.create.durationMs ?? null,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }))

    utilsMock.resolveImageSourceFromGeneration
      .mockResolvedValueOnce('generated-source-1')
      .mockResolvedValueOnce('generated-source-2')

    utilsMock.uploadImageSourceToCos
      .mockResolvedValueOnce('cos/panel-candidate-1.png')
      .mockResolvedValueOnce('cos/panel-candidate-2.png')
    utilsMock.uploadImageSourceToCosWithMetadata
      .mockResolvedValueOnce({
        key: 'cos/panel-candidate-1.png',
        metadata: { mimeType: 'image/png', sizeBytes: 1024, width: 1280, height: 720 },
      })
      .mockResolvedValueOnce({
        key: 'cos/panel-candidate-2.png',
        metadata: { mimeType: 'image/png', sizeBytes: 1024, width: 1280, height: 720 },
      })
    aiRuntimeMock.executeAiVisionStep.mockResolvedValue({
      text: JSON.stringify({ passes: true, issues: [] }),
    })
  })

  it('missing panelId -> explicit error', async () => {
    const job = buildJob({}, '')
    await expect(handlePanelImageTask(job)).rejects.toThrow('panelId missing')
  })

  it('first generation -> persists main image and candidate list', async () => {
    const job = buildJob({ candidateCount: 2 })
    const result = await handlePanelImageTask(job)

    expect(result).toEqual(expect.objectContaining({
      panelId: 'panel-1',
      candidateCount: 2,
      imageUrl: 'cos/panel-candidate-1.png',
    }))

    expect(utilsMock.resolveImageSourceFromGeneration).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        modelId: 'storyboard-model-1',
        prompt: expect.stringContaining('执行优先级修正'),
        allowTaskExternalIdResume: false,
        options: expect.objectContaining({
          referenceImages: ['normalized:https://signed.example/ref-1.png'],
          aspectRatio: '16:9',
        }),
      }),
    )
    expect(utilsMock.resolveImageSourceFromGeneration).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        prompt: expect.stringContaining('Visible character count lock: exactly 1 named character(s) may appear: Hero.'),
      }),
    )
    expect(utilsMock.resolveImageSourceFromGeneration).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        prompt: expect.stringContaining('This is a one-person shot. Show only Hero; do not create a second copy'),
      }),
    )
    expect(promptMock.buildPrompt).toHaveBeenCalledWith(expect.objectContaining({
      variables: expect.objectContaining({
        storyboard_text_json_input: expect.stringContaining('"slot": "left-side empty area"'),
      }),
    }))
    expect(promptMock.buildPrompt).toHaveBeenCalledWith(expect.objectContaining({
      variables: expect.objectContaining({
        storyboard_text_json_input: expect.stringContaining('"available_slots"'),
      }),
    }))
    expect(promptMock.buildPrompt).toHaveBeenCalledWith(expect.objectContaining({
      variables: expect.objectContaining({
        source_text: 'dialogue segment',
        storyboard_text_json_input: expect.stringContaining('"continuity"'),
      }),
    }))

    expect(prismaMock.novelPromotionPanel.update).toHaveBeenCalledWith({
      where: { id: 'panel-1' },
      data: {
        imageUrl: 'cos/panel-candidate-1.png',
        imageMediaId: 'media:cos/panel-candidate-1.png',
        candidateImages: JSON.stringify(['cos/panel-candidate-1.png', 'cos/panel-candidate-2.png']),
      },
    })
  })

  it('sanitizes off-screen people from single-character image prompt facts', async () => {
    prismaMock.novelPromotionPanel.findUnique.mockResolvedValueOnce({
      id: 'panel-1',
      storyboardId: 'storyboard-1',
      panelIndex: 1,
      shotType: '平视近景',
      cameraMove: '缓缓推近',
      description: '近景：老刘坐在桌前，眼睛注视前方对面的陈迹。',
      imagePrompt: null,
      videoPrompt: null,
      location: '办公室_夜间',
      characters: JSON.stringify([{ name: '老刘', appearance: '初始形象' }]),
      srtSegment: '老刘认真打量对面的少年。',
      photographyRules: null,
      actingNotes: null,
      sketchImageUrl: null,
      imageUrl: null,
    })
    sharedMock.resolveNovelData.mockResolvedValueOnce({
      videoRatio: '16:9',
      characters: [
        {
          name: '老刘',
          appearances: [{
            changeReason: '初始形象',
            description: 'middle-aged doctor',
            descriptions: JSON.stringify(['middle-aged doctor']),
            imageUrls: JSON.stringify([]),
            imageUrl: null,
            selectedIndex: 0,
          }],
        },
        {
          name: '陈迹',
          appearances: [],
        },
      ],
      locations: [],
    } as never)
    utilsMock.resolveImageSourceFromGeneration.mockReset()
    utilsMock.resolveImageSourceFromGeneration.mockResolvedValueOnce('generated-sanitized-source')
    mockImageUploads('cos/panel-sanitized.png')

    await handlePanelImageTask(buildJob({ candidateCount: 1 }))

    const buildPromptCalls = promptMock.buildPrompt.mock.calls as unknown as Array<[{
      variables: Record<string, string>
    }]>
    const promptArgs = buildPromptCalls[buildPromptCalls.length - 1]?.[0]
    expect(promptArgs).toBeTruthy()
    expect(promptArgs.variables.source_text).not.toContain('少年')
    expect(promptArgs.variables.source_text).toContain('镜头外对象')
    expect(promptArgs.variables.storyboard_text_json_input).not.toContain('陈迹')
    expect(promptArgs.variables.storyboard_text_json_input).toContain('画外对象（不可见，不得绘制）')
    expect(promptArgs.variables.storyboard_text_json_input).toContain('画面只显示老刘')
  })

  it('blocks candidate persistence when generated image aspect ratio is not compliant', async () => {
    utilsMock.resolveImageSourceFromGeneration.mockReset()
    utilsMock.resolveImageSourceFromGeneration.mockResolvedValueOnce('generated-wrong-aspect-source')
    utilsMock.uploadImageSourceToCosWithMetadata.mockReset()
    utilsMock.uploadImageSourceToCosWithMetadata.mockResolvedValueOnce({
      key: 'cos/panel-wrong-aspect.png',
      metadata: { mimeType: 'image/png', sizeBytes: 1024, width: 720, height: 1280 },
    })

    await expect(handlePanelImageTask(buildJob({ candidateCount: 1 }))).rejects.toThrow(
      'PANEL_IMAGE_AUDIT_ASPECT_RATIO_MISMATCH',
    )

    expect(prismaMock.novelPromotionPanel.update).not.toHaveBeenCalled()
    expect(prismaMock.task.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'task-panel-image-1' },
      data: expect.objectContaining({
        result: expect.objectContaining({
          panelImageAudit: expect.objectContaining({
            code: 'PANEL_IMAGE_AUDIT_ASPECT_RATIO_MISMATCH',
          }),
        }),
      }),
    }))
  })

  it('records audit report and persists candidate when vision audit detects wrong content', async () => {
    utilsMock.resolveImageSourceFromGeneration.mockReset()
    utilsMock.resolveImageSourceFromGeneration.mockResolvedValueOnce('generated-wrong-content-source')
    mockImageUploads('cos/panel-wrong-content.png')
    aiRuntimeMock.executeAiVisionStep.mockResolvedValueOnce({
      text: JSON.stringify({
        passes: false,
        issues: ['wrong people', 'wrong scene'],
      }),
    })

    const result = await handlePanelImageTask(buildJob({ candidateCount: 1 }))

    expect(result).toEqual(expect.objectContaining({
      panelId: 'panel-1',
      candidateCount: 1,
      imageUrl: 'cos/panel-wrong-content.png',
      panelImageAuditReports: [
        expect.objectContaining({
          ok: false,
          code: 'PANEL_IMAGE_AUDIT_CONTENT_MISMATCH',
          issues: ['wrong people', 'wrong scene'],
        }),
      ],
    }))
    expect(prismaMock.novelPromotionPanel.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'panel-1' },
      data: expect.objectContaining({
        imageUrl: 'cos/panel-wrong-content.png',
      }),
    }))
    expect(prismaMock.task.update).not.toHaveBeenCalled()
  })

  it('records audit report and persists candidate when vision runtime is unavailable', async () => {
    utilsMock.resolveImageSourceFromGeneration.mockReset()
    utilsMock.resolveImageSourceFromGeneration.mockResolvedValueOnce('generated-vision-runtime-source')
    mockImageUploads('cos/panel-vision-runtime.png')
    aiRuntimeMock.executeAiVisionStep.mockRejectedValueOnce(new Error('401 User not found.'))

    const result = await handlePanelImageTask(buildJob({ candidateCount: 1 }))

    expect(result).toEqual(expect.objectContaining({
      panelId: 'panel-1',
      candidateCount: 1,
      imageUrl: 'cos/panel-vision-runtime.png',
      panelImageAuditReports: [
        expect.objectContaining({
          ok: false,
          code: 'PANEL_IMAGE_AUDIT_VISION_RUNTIME_FAILED',
          message: expect.stringContaining('401 User not found.'),
        }),
      ],
    }))
    expect(prismaMock.novelPromotionPanel.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'panel-1' },
      data: expect.objectContaining({
        imageUrl: 'cos/panel-vision-runtime.png',
      }),
    }))
  })

  it('regeneration branch -> keeps old image in previousImageUrl and stores candidates only', async () => {
    utilsMock.resolveImageSourceFromGeneration.mockReset()
    mockImageUploads('cos/panel-regenerated.png')

    prismaMock.novelPromotionPanel.findUnique.mockResolvedValueOnce({
      id: 'panel-1',
      storyboardId: 'storyboard-1',
      panelIndex: 0,
      shotType: 'close-up',
      cameraMove: 'static',
      description: 'hero close-up',
      imagePrompt: null,
      videoPrompt: 'dramatic',
      location: 'Old Town',
      characters: '[]',
      srtSegment: null,
      photographyRules: null,
      actingNotes: null,
      sketchImageUrl: 'images/sketch.png',
      imageUrl: 'cos/panel-old.png',
      imageMediaId: null,
      previousImageUrl: null,
      previousImageMediaId: null,
    })

    utilsMock.resolveImageSourceFromGeneration.mockResolvedValueOnce('generated-source-regen')

    const job = buildJob({ candidateCount: 1 })
    const result = await handlePanelImageTask(job)

    expect(result).toEqual(expect.objectContaining({
      panelId: 'panel-1',
      candidateCount: 1,
      imageUrl: null,
    }))

    expect(prismaMock.novelPromotionPanel.update).toHaveBeenCalledWith({
      where: { id: 'panel-1' },
      data: {
        previousImageUrl: 'cos/panel-old.png',
        previousImageMediaId: 'media:cos/panel-old.png',
        candidateImages: JSON.stringify(['cos/panel-regenerated.png']),
      },
    })
  })

  it('migrates a queued ComfyUI image payload to the Codex image model', async () => {
    const job = buildJob({
      candidateCount: 1,
      imageModel: 'comfyui::baseimage/图片生成/ZImageTurbo造像',
    })

    await handlePanelImageTask(job)

    expect(utilsMock.resolveImageSourceFromGeneration).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        modelId: CODEX_DEFAULT_IMAGE_MODEL_KEY,
      }),
    )
  })

  it('passes Codex storyboard payloads through to image generation with normalized references', async () => {
    await handlePanelImageTask(buildJob({
      candidateCount: 1,
      imageModel: CODEX_DEFAULT_IMAGE_MODEL_KEY,
    }))

    expect(utilsMock.resolveImageSourceFromGeneration).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        modelId: CODEX_DEFAULT_IMAGE_MODEL_KEY,
        options: expect.objectContaining({
          referenceImages: ['normalized:https://signed.example/ref-1.png'],
        }),
      }),
    )
  })

  it('keeps 3+ character generation on the single-pass path by default', async () => {
    prismaMock.novelPromotionPanel.findUnique.mockResolvedValueOnce({
      id: 'panel-1',
      storyboardId: 'storyboard-1',
      panelIndex: 0,
      shotType: 'medium',
      cameraMove: 'follow',
      description: 'three people walking together',
      imagePrompt: 'three character composition',
      videoPrompt: null,
      location: 'Old Town',
      characters: JSON.stringify([
        { name: 'Hero', appearance: 'default' },
        { name: 'Doctor A', appearance: 'default' },
        { name: 'Doctor B', appearance: 'default' },
      ]),
      srtSegment: 'three-character shot',
      photographyRules: null,
      actingNotes: null,
      sketchImageUrl: 'images/sketch.png',
      imageUrl: null,
    })

    sharedMock.resolveNovelData.mockResolvedValueOnce({
      videoRatio: '16:9',
      characters: [
        {
          name: 'Hero',
          appearances: [{
            changeReason: 'default',
            description: 'hero',
            descriptions: JSON.stringify(['hero']),
            imageUrls: JSON.stringify(['images/hero.png']),
            imageUrl: 'images/hero.png',
            selectedIndex: 0,
          }],
        },
        {
          name: 'DoctorA',
          appearances: [{
            changeReason: 'default',
            description: 'doctor-a',
            descriptions: JSON.stringify(['doctor-a']),
            imageUrls: JSON.stringify(['images/doctor-a.png']),
            imageUrl: 'images/doctor-a.png',
            selectedIndex: 0,
          }],
        },
        {
          name: 'DoctorB',
          appearances: [{
            changeReason: 'default',
            description: 'doctor-b',
            descriptions: JSON.stringify(['doctor-b']),
            imageUrls: JSON.stringify(['images/doctor-b.png']),
            imageUrl: 'images/doctor-b.png',
            selectedIndex: 0,
          }],
        },
      ],
      locations: [
        {
          name: 'Old Town',
          images: [{
            isSelected: true,
            description: 'night clinic',
            imageUrl: 'images/location.png',
            availableSlots: JSON.stringify(['left', 'center', 'right']),
          }],
        },
      ],
    } as never)

    utilsMock.resolveImageSourceFromGeneration.mockReset()
    utilsMock.resolveImageSourceFromGeneration.mockResolvedValueOnce('generated-three-character-source')
    mockImageUploads('cos/panel-three-character.png')

    const result = await handlePanelImageTask(buildJob({ candidateCount: 1 }))

    expect(result).toEqual(expect.objectContaining({
      panelId: 'panel-1',
      candidateCount: 1,
      imageUrl: 'cos/panel-three-character.png',
    }))

    expect(utilsMock.resolveImageSourceFromGeneration).toHaveBeenCalledTimes(1)
    expect(utilsMock.resolveImageSourceFromGeneration).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        modelId: 'storyboard-model-1',
        options: expect.objectContaining({
          aspectRatio: '16:9',
          referenceImages: ['normalized:https://signed.example/ref-1.png'],
        }),
      }),
    )
  })
})
