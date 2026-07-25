import { describe, expect, it } from 'vitest'
import { QUEUE_NAME } from '@/lib/task/queues'

describe('task queue names', () => {
  it('uses the configured prefix to isolate test workers from development workers', () => {
    const prefix = process.env.QUEUE_NAME_PREFIX?.trim() || 'opendrama'

    expect(QUEUE_NAME).toEqual({
      IMAGE: `${prefix}-image`,
      VIDEO: `${prefix}-video`,
      VOICE: `${prefix}-voice`,
      TEXT: `${prefix}-text`,
    })
  })
})
