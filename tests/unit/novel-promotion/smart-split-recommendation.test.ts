import { describe, expect, it } from 'vitest'

import { shouldRecommendSmartSplit } from '@/lib/novel-promotion/smart-split-recommendation'

describe('shouldRecommendSmartSplit', () => {
  it('keeps a long single chapter as one medium-length episode', () => {
    expect(shouldRecommendSmartSplit(`第1章 归零\n\n${'正文'.repeat(1_100)}`)).toBe(false)
  })

  it('recommends smart split only for a long import containing distinct chapters', () => {
    expect(shouldRecommendSmartSplit(`第1章 归零\n${'正文'.repeat(600)}\n第2章 入院\n${'正文'.repeat(600)}`)).toBe(true)
  })
})
