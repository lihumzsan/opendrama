import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { TASK_TYPE } from '@/lib/task/types'
import { buildMockRequest } from '../../../helpers/request'

const transactionMock = vi.hoisted(() => vi.fn())
const maybeSubmitLLMTaskMock = vi.hoisted(() =>
  vi.fn<typeof import('@/lib/llm-observe/route-task').maybeSubmitLLMTask>(async () => NextResponse.json({
    success: true,
    async: true,
    taskId: 'task-chapter-1',
    runId: null,
    status: 'queued',
    deduped: false,
  })),
)

const batchFindFirstMock = vi.hoisted(() => vi.fn())
const batchFindManyMock = vi.hoisted(() => vi.fn())
const batchFindUniqueMock = vi.hoisted(() => vi.fn())
const batchCreateMock = vi.hoisted(() => vi.fn())
const batchUpdateMock = vi.hoisted(() => vi.fn())
const episodeFindFirstMock = vi.hoisted(() => vi.fn())
const episodeFindManyMock = vi.hoisted(() => vi.fn())
const episodeCreateMock = vi.hoisted(() => vi.fn())
const episodeUpdateMock = vi.hoisted(() => vi.fn())
const projectUpdateMock = vi.hoisted(() => vi.fn())

const prismaMock = vi.hoisted(() => ({
  $transaction: transactionMock,
  novelPromotionProject: {
    findFirst: vi.fn(),
  },
  novelPromotionChapterBatch: {
    findFirst: batchFindFirstMock,
    findMany: batchFindManyMock,
    findUnique: batchFindUniqueMock,
    create: batchCreateMock,
    update: batchUpdateMock,
  },
  novelPromotionEpisode: {
    findFirst: episodeFindFirstMock,
    findMany: episodeFindManyMock,
  },
  novelPromotionScreenplay: {
    count: vi.fn(),
  },
  novelPromotionClip: {
    count: vi.fn(),
  },
  novelPromotionShot: {
    count: vi.fn(),
  },
  novelPromotionStoryboard: {
    count: vi.fn(),
  },
  novelPromotionVoiceLine: {
    count: vi.fn(),
  },
}))

vi.mock('@/lib/api-auth', () => ({
  isErrorResponse: (value: unknown) => value instanceof Response,
  requireProjectAuthLight: async () => ({
    session: { user: { id: 'user-1' } },
    project: { id: 'project-1', userId: 'user-1' },
  }),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/llm-observe/route-task', () => ({
  maybeSubmitLLMTask: maybeSubmitLLMTaskMock,
}))

const sourceText = [
  '第一章',
  '她推开门，看见长廊尽头的灯还亮着。'.repeat(8),
  '',
  '第二章',
  '他听见钟声，知道旧约已经重新回到眼前。'.repeat(8),
].join('\n')
const candidatePlan = {
  planId: 'one-episode',
  title: '一集版',
  rationale: '两章形成一个完整目标',
  episodes: [{
    provisionalNumber: 1,
    name: '第一集',
    description: '她推开门后听见钟声',
    sourceStart: 0,
    sourceEnd: sourceText.length,
    sourceText,
    coreGoal: '进入新环境',
    dramaticArc: '进入-发现-悬念',
    endingHook: '钟声响起',
    adaptationNotes: {
      keep: ['开门', '钟声'],
      merge: ['两章合为一集'],
      remove: [],
      externalize: [],
      inferred: [],
    },
  }],
}

function request(path: string, body?: Record<string, unknown>) {
  return buildMockRequest({
    path,
    method: 'POST',
    body,
  })
}

function batch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'batch-1',
    novelPromotionProjectId: 'np-project-1',
    title: '第1-2章',
    sourceText,
    sourceFingerprint: 'fingerprint-1',
    chapterStartLabel: '第一章',
    chapterEndLabel: '第二章',
    status: 'analyzed',
    analysisJson: JSON.stringify({ summary: '章节摘要' }),
    candidateEpisodesJson: JSON.stringify([candidatePlan]),
    selectedPlanJson: null,
    createdEpisodeIdsJson: null,
    errorJson: null,
    createdAt: new Date('2026-08-07T00:00:00Z'),
    updatedAt: new Date('2026-08-07T00:00:00Z'),
    ...overrides,
  }
}

describe('chapter batch routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.novelPromotionProject.findFirst.mockResolvedValue({ id: 'np-project-1' })
    batchFindFirstMock.mockResolvedValue(null)
    batchFindManyMock.mockResolvedValue([batch()])
    batchFindUniqueMock.mockResolvedValue(batch())
    batchCreateMock.mockImplementation(async ({ data }) => ({ id: 'batch-created', ...data }))
    batchUpdateMock.mockImplementation(async ({ data }) => ({ id: 'batch-1', ...data }))
    episodeFindFirstMock.mockResolvedValue(null)
    episodeFindManyMock.mockResolvedValue([])
    prismaMock.novelPromotionScreenplay.count.mockResolvedValue(0)
    prismaMock.novelPromotionClip.count.mockResolvedValue(0)
    prismaMock.novelPromotionShot.count.mockResolvedValue(0)
    prismaMock.novelPromotionStoryboard.count.mockResolvedValue(0)
    prismaMock.novelPromotionVoiceLine.count.mockResolvedValue(0)
    episodeCreateMock.mockImplementation(async ({ data }) => ({ id: `episode-${data.episodeNumber}`, ...data }))
    episodeUpdateMock.mockImplementation(async ({ data }) => ({ id: 'episode-1', episodeNumber: 1, name: data.name, ...data }))
    projectUpdateMock.mockResolvedValue({ id: 'np-project-1' })
    transactionMock.mockImplementation(async (callback) => await callback({
      novelPromotionChapterBatch: {
        update: batchUpdateMock,
      },
      novelPromotionEpisode: {
        findFirst: episodeFindFirstMock,
        create: episodeCreateMock,
        update: episodeUpdateMock,
      },
      novelPromotionProject: {
        update: projectUpdateMock,
      },
      novelPromotionScreenplay: {
        deleteMany: vi.fn(),
      },
      novelPromotionVoiceLine: {
        deleteMany: vi.fn(),
      },
      novelPromotionStoryboard: {
        deleteMany: vi.fn(),
      },
      novelPromotionShot: {
        deleteMany: vi.fn(),
      },
      novelPromotionClip: {
        deleteMany: vi.fn(),
      },
    }))
  })

  it('saves source text as a draft batch without submitting an AI task', async () => {
    const { POST } = await import('@/app/api/novel-promotion/[projectId]/chapter-batches/route')
    const response = await POST(request('/api/novel-promotion/project-1/chapter-batches', {
      title: '第1-2章',
      sourceText,
      chapterStartLabel: '第一章',
      chapterEndLabel: '第二章',
    }), { params: Promise.resolve({ projectId: 'project-1' }) })

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      batch: {
        id: 'batch-created',
        status: 'draft',
        title: '第1-2章',
      },
    })
    expect(batchCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        novelPromotionProjectId: 'np-project-1',
        status: 'draft',
        sourceText,
      }),
    }))
    expect(maybeSubmitLLMTaskMock).not.toHaveBeenCalled()
  })

  it('rejects duplicate non-discarded source text in the same project', async () => {
    batchFindFirstMock.mockResolvedValueOnce(batch({ status: 'draft' }))

    const { POST } = await import('@/app/api/novel-promotion/[projectId]/chapter-batches/route')
    const response = await POST(request('/api/novel-promotion/project-1/chapter-batches', {
      title: '重复章节',
      sourceText,
    }), { params: Promise.resolve({ projectId: 'project-1' }) })

    expect(response.status).toBe(400)
    expect(batchCreateMock).not.toHaveBeenCalled()
  })

  it('submits an analyze task for an existing batch', async () => {
    const { POST } = await import('@/app/api/novel-promotion/[projectId]/chapter-batches/[batchId]/analyze/route')
    const response = await POST(request('/api/novel-promotion/project-1/chapter-batches/batch-1/analyze'), {
      params: Promise.resolve({ projectId: 'project-1', batchId: 'batch-1' }),
    })

    expect(response.status).toBe(200)
    expect(maybeSubmitLLMTaskMock).toHaveBeenCalledWith(expect.objectContaining({
      type: TASK_TYPE.CHAPTER_BATCH_ANALYZE,
      targetType: 'NovelPromotionChapterBatch',
      targetId: 'batch-1',
      body: { batchId: 'batch-1' },
    }))
  })

  it('confirms a selected plan by appending new episodes and marking the batch confirmed', async () => {
    const { POST } = await import('@/app/api/novel-promotion/[projectId]/chapter-batches/[batchId]/confirm/route')
    const response = await POST(request('/api/novel-promotion/project-1/chapter-batches/batch-1/confirm', {
      planId: 'one-episode',
      mode: 'append',
    }), { params: Promise.resolve({ projectId: 'project-1', batchId: 'batch-1' }) })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      mode: 'append',
      episodes: [{ id: 'episode-1', episodeNumber: 1, name: '第一集' }],
    })
    expect(episodeCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        novelPromotionProjectId: 'np-project-1',
        episodeNumber: 1,
        name: '第一集',
        description: expect.stringContaining('核心目标：进入新环境'),
        novelText: sourceText,
      }),
    }))
    expect(batchUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'confirmed',
        selectedPlanJson: expect.any(String),
        createdEpisodeIdsJson: JSON.stringify(['episode-1']),
      }),
    }))
  })

  it('persists preview-edited title summary and content on confirm', async () => {
    const editedText = `${sourceText}\n\n确认前手动补充的尾声。`

    const { POST } = await import('@/app/api/novel-promotion/[projectId]/chapter-batches/[batchId]/confirm/route')
    const response = await POST(request('/api/novel-promotion/project-1/chapter-batches/batch-1/confirm', {
      planId: 'one-episode',
      mode: 'append',
      episodes: [{
        name: '确认稿第一集',
        description: '确认稿摘要',
        novelText: editedText,
      }],
    }), { params: Promise.resolve({ projectId: 'project-1', batchId: 'batch-1' }) })

    expect(response.status).toBe(200)
    expect(episodeCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: '确认稿第一集',
        novelText: editedText,
        description: expect.stringContaining('确认稿摘要'),
      }),
    }))
    const selectedPlan = JSON.parse(batchUpdateMock.mock.calls[0][0].data.selectedPlanJson)
    expect(selectedPlan).toMatchObject({
      planId: 'one-episode:confirmed-preview',
      episodes: [{
        name: '确认稿第一集',
        description: '确认稿摘要',
        sourceText: editedText,
        sourceStart: 0,
        sourceEnd: editedText.length,
      }],
    })
  })

  it('returns existing episodes when a confirmed batch is confirmed again', async () => {
    batchFindUniqueMock.mockResolvedValueOnce(batch({
      status: 'confirmed',
      selectedPlanJson: JSON.stringify(candidatePlan),
      createdEpisodeIdsJson: JSON.stringify(['episode-2']),
    }))
    episodeFindManyMock.mockResolvedValueOnce([{ id: 'episode-2', episodeNumber: 2, name: '第二集' }])

    const { POST } = await import('@/app/api/novel-promotion/[projectId]/chapter-batches/[batchId]/confirm/route')
    const response = await POST(request('/api/novel-promotion/project-1/chapter-batches/batch-1/confirm', {
      planId: 'one-episode',
    }), { params: Promise.resolve({ projectId: 'project-1', batchId: 'batch-1' }) })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      idempotent: true,
      episodes: [{ id: 'episode-2' }],
    })
    expect(episodeCreateMock).not.toHaveBeenCalled()
  })

  it('requires explicit overwrite confirmation before updating an episode with generated assets', async () => {
    episodeFindFirstMock.mockResolvedValueOnce({ id: 'episode-1' })
    prismaMock.novelPromotionScreenplay.count.mockResolvedValueOnce(1)

    const { POST } = await import('@/app/api/novel-promotion/[projectId]/chapter-batches/[batchId]/confirm/route')
    const response = await POST(request('/api/novel-promotion/project-1/chapter-batches/batch-1/confirm', {
      planId: 'one-episode',
      mode: 'update_current',
      episodeId: 'episode-1',
    }), { params: Promise.resolve({ projectId: 'project-1', batchId: 'batch-1' }) })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: {
        details: {
          mode: 'update_current',
          dependents: {
            screenplays: 1,
          },
        },
      },
    })
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it('marks an unconfirmed batch discarded without deleting episodes', async () => {
    batchFindUniqueMock.mockResolvedValueOnce(batch({ status: 'analyzed' }))

    const { POST } = await import('@/app/api/novel-promotion/[projectId]/chapter-batches/[batchId]/discard/route')
    const response = await POST(request('/api/novel-promotion/project-1/chapter-batches/batch-1/discard'), {
      params: Promise.resolve({ projectId: 'project-1', batchId: 'batch-1' }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      batch: { status: 'discarded' },
    })
    expect(batchUpdateMock).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      data: { status: 'discarded' },
    })
  })
})
