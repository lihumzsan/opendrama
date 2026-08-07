import type { Job } from 'bullmq'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TASK_TYPE, type TaskJobData } from '@/lib/task/types'
import { validateCandidateEpisodePlans } from '@/lib/novel-promotion/chapter-batch/validation'

const sourceText = [
  '第一章 初遇',
  '山'.repeat(650),
  '',
  '第二章 军报',
  '海'.repeat(650),
].join('\n')

const batchUpdateMock = vi.hoisted(() => vi.fn())
const episodeCreateMock = vi.hoisted(() => vi.fn())

const prismaMock = vi.hoisted(() => ({
  novelPromotionChapterBatch: {
    findUnique: vi.fn(),
    update: batchUpdateMock,
  },
  novelPromotionProject: {
    findUnique: vi.fn(),
  },
  novelPromotionEpisode: {
    findMany: vi.fn(),
    create: episodeCreateMock,
  },
}))

const aiRuntimeMock = vi.hoisted(() => ({
  executeAiTextStep: vi.fn(),
}))

const configServiceMock = vi.hoisted(() => ({
  getUserModelConfig: vi.fn(async () => ({
    analysisModel: 'codex::gpt-5.5',
  })),
}))

const internalStreamMock = vi.hoisted(() => ({
  withInternalLLMStreamCallbacks: vi.fn(async (_callbacks: unknown, fn: () => Promise<unknown>) => await fn()),
}))

const sharedMock = vi.hoisted(() => ({
  reportTaskProgress: vi.fn(async () => {}),
}))

const utilsMock = vi.hoisted(() => ({
  assertTaskActive: vi.fn(async () => {}),
}))

const flushMock = vi.hoisted(() => vi.fn(async () => {}))
const llmStreamMock = vi.hoisted(() => ({
  createWorkerLLMStreamContext: vi.fn(() => ({ streamId: 'stream-1' })),
  createWorkerLLMStreamCallbacks: vi.fn(() => ({ flush: flushMock })),
}))

const promptMock = vi.hoisted(() => ({
  PROMPT_IDS: {
    NP_EPISODE_SCENE_ANALYSIS: 'np_episode_scene_analysis',
    NP_EPISODE_PLAN: 'np_episode_plan',
  },
  buildPrompt: vi.fn((input: { promptId: string; variables: Record<string, string> }) =>
    JSON.stringify({ promptId: input.promptId, ...input.variables })),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/ai-runtime', () => aiRuntimeMock)
vi.mock('@/lib/config-service', () => configServiceMock)
vi.mock('@/lib/llm-observe/internal-stream-context', () => internalStreamMock)
vi.mock('@/lib/workers/shared', () => sharedMock)
vi.mock('@/lib/workers/utils', () => utilsMock)
vi.mock('@/lib/workers/handlers/llm-stream', () => llmStreamMock)
vi.mock('@/lib/prompt-i18n', () => promptMock)

function buildJob(): Job<TaskJobData> {
  return {
    data: {
      taskId: 'task-chapter-batch-1',
      type: TASK_TYPE.CHAPTER_BATCH_ANALYZE,
      locale: 'zh',
      projectId: 'project-1',
      targetType: 'NovelPromotionChapterBatch',
      targetId: 'batch-1',
      payload: { batchId: 'batch-1' },
      userId: 'user-1',
    },
  } as unknown as Job<TaskJobData>
}

const sceneAnalysis = {
  scenes: [
    {
      startUnitId: 'unit_0001',
      endUnitId: 'unit_0001',
      title: '王府初遇',
      summary: '人物关系建立',
      characters: ['周生辰', '时宜'],
      goal: '建立关系',
      outcome: '互相留下印象',
      boundaryAfter: { closure: 7, hook: 4, transition: 8, causalBreakPenalty: 1 },
    },
    {
      startUnitId: 'unit_0002',
      endUnitId: 'unit_0002',
      title: '军报突至',
      summary: '危机进入主线',
      characters: ['周生辰'],
      goal: '应对危机',
      outcome: '决定出征',
      boundaryAfter: { closure: 8, hook: 9, transition: 8, causalBreakPenalty: 0 },
    },
  ],
}

const validPlan = {
  profile: 'horizontal_motion_comic',
  episodes: [{
    startSceneId: 'scene_001',
    endSceneId: 'scene_002',
    title: '初遇风云',
    summary: '相遇后军报突至',
    coreGoal: '建立人物关系并引出危机',
    dramaticArc: '相遇-缓和-危机',
    endingHook: '周生辰决定出征',
    rationale: '两场戏构成完整的关系建立与危机触发',
  }],
}

describe('chapter batch analyze worker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.novelPromotionChapterBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      novelPromotionProjectId: 'np-project-1',
      title: '第1-2章',
      sourceText,
      sourceFingerprint: 'fingerprint-1',
      status: 'draft',
    })
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue({ id: 'np-project-1', projectId: 'project-1' })
    prismaMock.novelPromotionEpisode.findMany.mockResolvedValue([])
  })

  it('persists analyzed candidate plans and does not create episodes', async () => {
    aiRuntimeMock.executeAiTextStep
      .mockResolvedValueOnce({ text: JSON.stringify(sceneAnalysis) })
      .mockResolvedValueOnce({ text: JSON.stringify(validPlan) })

    const { handleChapterBatchAnalyzeTask } = await import('@/lib/workers/handlers/chapter-batch-analyze')
    const result = await handleChapterBatchAnalyzeTask(buildJob())

    expect(result).toMatchObject({
      batchId: 'batch-1',
      planCount: 1,
      episodeCount: 1,
    })
    expect(batchUpdateMock).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      data: { status: 'analyzing', errorJson: null },
    })
    const analyzedUpdate = batchUpdateMock.mock.calls.find((call) => call[0]?.data?.status === 'analyzed')?.[0]
    expect(analyzedUpdate).toBeTruthy()
    const candidatePlans = validateCandidateEpisodePlans(sourceText, JSON.parse(analyzedUpdate.data.candidateEpisodesJson))
    expect(candidatePlans[0]?.episodes[0]?.sourceText).toBe(sourceText)
    expect(JSON.parse(analyzedUpdate.data.analysisJson)).toMatchObject({
      summary: expect.stringContaining('人物关系建立'),
    })
    expect(episodeCreateMock).not.toHaveBeenCalled()
  })

  it('persists failed status and validation details when planning cannot be repaired', async () => {
    const invalidPlan = {
      profile: 'horizontal_motion_comic',
      episodes: [{
        startSceneId: 'scene_002',
        endSceneId: 'scene_002',
        title: '错误方案',
        summary: '遗漏第一场',
      }],
    }
    aiRuntimeMock.executeAiTextStep
      .mockResolvedValueOnce({ text: JSON.stringify(sceneAnalysis) })
      .mockResolvedValueOnce({ text: JSON.stringify(invalidPlan) })
      .mockResolvedValueOnce({ text: JSON.stringify(invalidPlan) })

    const { handleChapterBatchAnalyzeTask } = await import('@/lib/workers/handlers/chapter-batch-analyze')

    await expect(handleChapterBatchAnalyzeTask(buildJob())).rejects.toThrow('scene coverage gap')
    expect(batchUpdateMock).toHaveBeenLastCalledWith({
      where: { id: 'batch-1' },
      data: {
        status: 'failed',
        errorJson: expect.stringContaining('scene coverage gap'),
      },
    })
    expect(episodeCreateMock).not.toHaveBeenCalled()
  })
})
