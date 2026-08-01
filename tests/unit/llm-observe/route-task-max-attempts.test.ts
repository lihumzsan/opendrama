import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const submitTaskMock = vi.hoisted(() => vi.fn(async () => ({
  success: true,
  async: true,
  taskId: 'task-1',
  runId: null,
  status: 'queued',
  deduped: false,
})))

vi.mock('@/lib/task/submitter', () => ({ submitTask: submitTaskMock }))
vi.mock('@/lib/llm-observe/config', () => ({
  LLM_OBSERVE_DEFAULT_MODE: 'loading',
  LLM_OBSERVE_ENABLED: true,
}))
vi.mock('@/lib/llm-observe/task-policy', () => ({
  getLLMTaskPolicy: () => ({
    consoleEnabled: true,
    displayMode: 'loading',
    fullscreen: false,
    priority: 0,
    captureReasoning: true,
  }),
}))
vi.mock('@/lib/llm-observe/stage-pipeline', () => ({
  getTaskFlowMeta: () => ({
    flowId: 'episode-split',
    flowStageIndex: 1,
    flowStageTotal: 1,
    flowStageTitle: '智能分集',
  }),
}))
vi.mock('@/lib/task/resolve-locale', () => ({
  resolveRequiredTaskLocale: () => 'zh',
}))
vi.mock('@/lib/api-errors', () => ({
  getRequestId: () => 'request-1',
}))

import { maybeSubmitLLMTask } from '@/lib/llm-observe/route-task'
import { TASK_TYPE } from '@/lib/task/types'

describe('maybeSubmitLLMTask max attempts', () => {
  beforeEach(() => {
    submitTaskMock.mockClear()
  })

  it('forwards a route-specific single-attempt policy to task creation', async () => {
    const request = new NextRequest('http://localhost/api/example', {
      method: 'POST',
      body: JSON.stringify({ async: true }),
      headers: { 'content-type': 'application/json' },
    })

    await maybeSubmitLLMTask({
      request,
      userId: 'user-1',
      projectId: 'project-1',
      type: TASK_TYPE.EPISODE_SPLIT_LLM,
      targetType: 'NovelPromotionProject',
      targetId: 'project-1',
      routePath: '/api/novel-promotion/project-1/episodes/split',
      body: { async: true, content: 'x'.repeat(120) },
      maxAttempts: 1,
    })

    expect(submitTaskMock).toHaveBeenCalledWith(expect.objectContaining({
      type: TASK_TYPE.EPISODE_SPLIT_LLM,
      maxAttempts: 1,
    }))
  })
})
