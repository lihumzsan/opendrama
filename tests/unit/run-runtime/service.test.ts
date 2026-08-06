import { describe, expect, it, vi } from 'vitest'

const transactionMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: transactionMock,
  },
}))

import { appendRunEventWithSeq } from '@/lib/run-runtime/service'
import { RUN_EVENT_TYPE } from '@/lib/run-runtime/types'

describe('run runtime service', () => {
  it('allows enough time for a remote run-event transaction to finish', async () => {
    const graphRunUpdate = vi.fn()
      .mockResolvedValueOnce({ id: 'run-1', lastSeq: 1 })
      .mockResolvedValueOnce({ id: 'run-1' })
    const graphEventCreate = vi.fn().mockResolvedValue({
      id: 1 as unknown as bigint,
      runId: 'run-1',
      projectId: 'project-1',
      userId: 'user-1',
      seq: 1,
      eventType: RUN_EVENT_TYPE.RUN_START,
      stepKey: null,
      attempt: null,
      lane: null,
      payload: { stage: 'received' },
      createdAt: new Date('2026-08-06T00:00:00.000Z'),
    })
    transactionMock.mockImplementation(async (callback) => await callback({
      graphRun: { update: graphRunUpdate },
      graphEvent: { create: graphEventCreate },
    }))

    await appendRunEventWithSeq({
      runId: 'run-1',
      projectId: 'project-1',
      userId: 'user-1',
      eventType: RUN_EVENT_TYPE.RUN_START,
      payload: { stage: 'received' },
    })

    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), {
      maxWait: 10_000,
      timeout: 30_000,
    })
  })
})
