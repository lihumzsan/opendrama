import type { Job } from 'bullmq'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TASK_TYPE, type TaskJobData } from '@/lib/task/types'

const prismaMock = vi.hoisted(() => ({
  project: {
    findUnique: vi.fn(async () => ({ id: 'project-1' })),
  },
  novelPromotionProject: {
    findFirst: vi.fn(async () => ({ id: 'np-project-1' })),
  },
  novelPromotionEpisode: {
    findMany: vi.fn(async () => [] as Array<{
      episodeNumber: number
      name: string
      description: string | null
      novelText: string | null
    }>),
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
  createWorkerLLMStreamCallbacks: vi.fn(() => ({
    flush: flushMock,
  })),
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

import { handleEpisodeSplitTask } from '@/lib/workers/handlers/episode-split'

function buildJob(content: string): Job<TaskJobData> {
  return {
    data: {
      taskId: 'task-episode-split-1',
      type: TASK_TYPE.EPISODE_SPLIT_LLM,
      locale: 'zh',
      projectId: 'project-1',
      targetType: 'NovelPromotionProject',
      targetId: 'project-1',
      payload: { content },
      userId: 'user-1',
    },
  } as unknown as Job<TaskJobData>
}

function longSourceContent() {
  return [
    '第一章 初遇',
    '山'.repeat(650),
    '',
    '第二章 军报',
    '海'.repeat(650),
  ].join('\n')
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
    dramaticArc: '相遇—缓和—危机',
    endingHook: '周生辰决定出征',
    rationale: '两场戏构成完整的关系建立与危机触发',
  }],
}

describe('semantic episode split worker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.project.findUnique.mockResolvedValue({ id: 'project-1' })
    prismaMock.novelPromotionProject.findFirst.mockResolvedValue({ id: 'np-project-1' })
    prismaMock.novelPromotionEpisode.findMany.mockResolvedValue([])
    configServiceMock.getUserModelConfig.mockResolvedValue({
      analysisModel: 'codex::gpt-5.5',
    })
  })

  it('fails fast when content is too short', async () => {
    await expect(handleEpisodeSplitTask(buildJob('short text'))).rejects.toThrow('至少需要 100 字')
    expect(aiRuntimeMock.executeAiTextStep).not.toHaveBeenCalled()
  })

  it('analyzes source units, plans episodes, and assembles source content locally', async () => {
    const content = longSourceContent()
    aiRuntimeMock.executeAiTextStep
      .mockResolvedValueOnce({ text: JSON.stringify(sceneAnalysis) })
      .mockResolvedValueOnce({ text: JSON.stringify(validPlan) })

    const result = await handleEpisodeSplitTask(buildJob(content))

    expect(result.method).toBe('semantic')
    expect(result.profile).toBe('horizontal_motion_comic')
    expect(result.episodes).toHaveLength(1)
    expect(result.episodes[0]?.content).toBe(content)
    expect(result.episodes[0]?.wordCount).toBeGreaterThan(400)
    expect(aiRuntimeMock.executeAiTextStep).toHaveBeenCalledTimes(2)
    expect(aiRuntimeMock.executeAiTextStep).toHaveBeenNthCalledWith(1, expect.objectContaining({
      model: 'codex::gpt-5.5',
      temperature: 0.2,
      reasoningEffort: 'medium',
    }))
  })

  it('continues episode numbering after existing episodes', async () => {
    prismaMock.novelPromotionEpisode.findMany.mockResolvedValue([{
      episodeNumber: 4,
      name: '第四集',
      description: null,
      novelText: '既有内容',
    }])
    aiRuntimeMock.executeAiTextStep
      .mockResolvedValueOnce({ text: JSON.stringify(sceneAnalysis) })
      .mockResolvedValueOnce({ text: JSON.stringify(validPlan) })

    const result = await handleEpisodeSplitTask(buildJob(longSourceContent()))

    expect(result.episodes[0]?.number).toBe(5)
  })

  it('includes the validation failure in a single repair prompt', async () => {
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
      .mockResolvedValueOnce({ text: JSON.stringify(validPlan) })

    const result = await handleEpisodeSplitTask(buildJob(longSourceContent()))

    expect(result.success).toBe(true)
    expect(aiRuntimeMock.executeAiTextStep).toHaveBeenCalledTimes(3)
    const repairCall = aiRuntimeMock.executeAiTextStep.mock.calls[2]?.[0] as {
      messages: Array<{ content: string }>
    }
    expect(repairCall.messages[0]?.content).toContain('scene coverage gap')
    expect(repairCall.messages[0]?.content).toContain('错误方案')
  })

  it('repairs a repeated plan that skips the opening scene', async () => {
    const invalidPlan = {
      profile: 'horizontal_motion_comic',
      episodes: [{
        startSceneId: 'scene_002',
        endSceneId: 'scene_002',
        title: '仍然错误',
        summary: '仍然遗漏第一场',
      }],
    }
    aiRuntimeMock.executeAiTextStep
      .mockResolvedValueOnce({ text: JSON.stringify(sceneAnalysis) })
      .mockResolvedValueOnce({ text: JSON.stringify(invalidPlan) })
      .mockResolvedValueOnce({ text: JSON.stringify(invalidPlan) })

    const result = await handleEpisodeSplitTask(buildJob(longSourceContent()))

    expect(result.success).toBe(true)
    expect(result.episodes[0]?.content).toBe(longSourceContent())
    expect(aiRuntimeMock.executeAiTextStep).toHaveBeenCalledTimes(3)
    expect(flushMock).toHaveBeenCalledTimes(1)
  })
})
