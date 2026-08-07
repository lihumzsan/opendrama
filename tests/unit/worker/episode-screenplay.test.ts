import type { Job } from 'bullmq'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TaskJobData } from '@/lib/task/types'

const prismaMock = vi.hoisted(() => ({
  project: { findUnique: vi.fn() },
  novelPromotionProject: { findUnique: vi.fn() },
  novelPromotionEpisode: { findUnique: vi.fn() },
  novelPromotionScreenplay: { upsert: vi.fn() },
  novelPromotionVoiceLine: { deleteMany: vi.fn() },
  novelPromotionStoryboard: { deleteMany: vi.fn() },
  novelPromotionShot: { deleteMany: vi.fn() },
  novelPromotionClip: { deleteMany: vi.fn(), createMany: vi.fn() },
  $transaction: vi.fn(),
}))
const helperMock = vi.hoisted(() => ({
  persistAnalyzedCharacters: vi.fn(async () => [{ id: 'character-1', name: '陈迹' }]),
  persistAnalyzedLocations: vi.fn(async () => [{ id: 'location-1', name: '医生办公室' }]),
  persistAnalyzedProps: vi.fn(async () => [{ id: 'prop-1', name: '素描纸' }]),
}))
const orchestratorMock = vi.hoisted(() => ({ runEpisodeScreenplayOrchestrator: vi.fn() }))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/ai-runtime', () => ({ executeAiTextStep: vi.fn() }))
vi.mock('@/lib/config-service', () => ({
  resolveProjectModelCapabilityGenerationOptions: vi.fn(async () => ({ reasoningEffort: 'high' })),
}))
vi.mock('@/lib/prompt-i18n', () => ({
  PROMPT_IDS: {
    NP_AGENT_CHARACTER_PROFILE: 'characters', NP_SELECT_LOCATION: 'locations', NP_SELECT_PROP: 'props',
    NP_EPISODE_SCREENPLAY_PLAN: 'plan', NP_EPISODE_SCENE_SCREENPLAY: 'scene',
  },
  getPromptTemplate: vi.fn(() => 'prompt'),
}))
vi.mock('@/lib/run-runtime/service', () => ({ createArtifact: vi.fn(async () => undefined) }))
vi.mock('@/lib/run-runtime/workflow-lease', () => ({
  assertWorkflowRunActive: vi.fn(async () => undefined),
  withWorkflowRunLease: vi.fn(async (params: { run: () => Promise<unknown> }) => ({ claimed: true, result: await params.run() })),
}))
vi.mock('@/lib/workers/shared', () => ({ reportTaskProgress: vi.fn(async () => undefined) }))
vi.mock('@/lib/novel-promotion/story-to-script/episode-orchestrator', () => orchestratorMock)
vi.mock('@/lib/novel-promotion/screenplay/source', () => ({ toScreenplaySource: (value: string) => value }))
vi.mock('@/lib/workers/handlers/story-to-script-helpers', () => ({
  parseEffort: vi.fn(() => null),
  parseTemperature: vi.fn(() => 0.7),
  persistAnalyzedCharacters: helperMock.persistAnalyzedCharacters,
  persistAnalyzedLocations: helperMock.persistAnalyzedLocations,
  persistAnalyzedProps: helperMock.persistAnalyzedProps,
}))
vi.mock('@/lib/workers/handlers/resolve-analysis-model', () => ({ resolveAnalysisModel: vi.fn(async () => 'llm::test') }))
vi.mock('@/lib/workers/handlers/workflow-run-id', () => ({ resolveWorkflowRunId: vi.fn(async () => 'run-1') }))

import { handleEpisodeScreenplayTask } from '@/lib/workers/handlers/episode-screenplay'

function buildJob(): Job<TaskJobData> {
  return {
    queueName: 'text',
    data: {
      taskId: 'task-1', type: 'episode_screenplay_run', locale: 'zh', projectId: 'project-1',
      episodeId: 'episode-1', targetType: 'NovelPromotionEpisode', targetId: 'episode-1',
      payload: { episodeId: 'episode-1', content: '陈迹来到医生办公室。', runId: 'run-1' }, userId: 'user-1',
    },
  } as unknown as Job<TaskJobData>
}

describe('worker episode screenplay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => await fn(prismaMock))
    prismaMock.project.findUnique.mockResolvedValue({ id: 'project-1', name: 'Project One' })
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue({
      id: 'np-project-1', analysisModel: 'llm::test', characters: [], locations: [],
    })
    prismaMock.novelPromotionEpisode.findUnique.mockResolvedValue({
      id: 'episode-1', novelPromotionProjectId: 'np-project-1', novelText: '陈迹来到医生办公室。',
    })
    orchestratorMock.runEpisodeScreenplayOrchestrator.mockResolvedValue({
      analyzedCharacters: [{ name: '陈迹' }],
      analyzedLocations: [{ name: '医生办公室', summary: '精神评估室' }],
      analyzedProps: [{ name: '素描纸', summary: '陈迹随身携带的纸' }],
      screenplay: {
        title: '青山医院',
        scenes: [{
          sceneNumber: 1, sourceStart: 0, sourceEnd: 10, sourceText: '陈迹来到医生办公室。',
          heading: { intExt: 'INT', location: '医生办公室', time: '夜间' },
          entryState: '陈迹进入', goal: '完成问诊', conflict: '医生怀疑他', outcome: '决定留观', exitState: '陈迹留下',
          content: [{ type: 'dialogue', character: '陈迹', lines: '我没事。' }],
        }],
      },
    })
  })

  it('persists analyzed assets before storing the generated screenplay', async () => {
    await handleEpisodeScreenplayTask(buildJob())

    expect(helperMock.persistAnalyzedCharacters).toHaveBeenCalledWith(expect.objectContaining({
      projectInternalId: 'np-project-1', analyzedCharacters: [{ name: '陈迹' }], db: prismaMock,
    }))
    expect(helperMock.persistAnalyzedLocations).toHaveBeenCalledWith(expect.objectContaining({
      projectInternalId: 'np-project-1', analyzedLocations: [{ name: '医生办公室', summary: '精神评估室' }], db: prismaMock,
    }))
    expect(helperMock.persistAnalyzedProps).toHaveBeenCalledWith(expect.objectContaining({
      projectInternalId: 'np-project-1', analyzedProps: [{ name: '素描纸', summary: '陈迹随身携带的纸' }], db: prismaMock,
    }))
  })
})
