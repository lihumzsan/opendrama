import { describe, expect, it } from 'vitest'
import { TASK_TYPE } from '@/lib/task/types'
import { resolveTaskQueueAttempts } from '@/lib/task/queues'

describe('task queue attempt policy', () => {
  it('runs semantic episode splitting only once at the queue layer', () => {
    expect(resolveTaskQueueAttempts(TASK_TYPE.EPISODE_SPLIT_LLM)).toBe(1)
  })

  it('preserves an explicit attempt count for ordinary task types', () => {
    expect(resolveTaskQueueAttempts(TASK_TYPE.IMAGE_PANEL, 3)).toBe(3)
  })
})
