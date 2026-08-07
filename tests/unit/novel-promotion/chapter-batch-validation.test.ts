import { describe, expect, it } from 'vitest'

import {
  hashChapterBatchSource,
  validateCandidateEpisodePlans,
} from '@/lib/novel-promotion/chapter-batch/validation'

const sourceText = '第一章\n她推开门。\n\n第二章\n他听见钟声。'

function validPlan() {
  return [{
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
        externalize: ['紧张心理用动作表现'],
        inferred: ['钟声可能提示危险'],
      },
    }],
  }]
}

describe('chapter batch candidate validation', () => {
  it('rejects empty candidate plans', () => {
    expect(() => validateCandidateEpisodePlans(sourceText, [])).toThrow('candidate episode plans are required')
  })

  it('rejects ranges whose source text does not match the source slice', () => {
    const plans = validPlan()
    plans[0].episodes[0].sourceText = 'wrong text'

    expect(() => validateCandidateEpisodePlans(sourceText, plans)).toThrow('sourceText does not match source range')
  })

  it('rejects gaps and overlaps inside a plan', () => {
    const plans = [{
      ...validPlan()[0],
      episodes: [
        { ...validPlan()[0].episodes[0], sourceEnd: 6, sourceText: sourceText.slice(0, 6) },
        { ...validPlan()[0].episodes[0], provisionalNumber: 2, sourceStart: 5, sourceEnd: sourceText.length, sourceText: sourceText.slice(5) },
      ],
    }]

    expect(() => validateCandidateEpisodePlans(sourceText, plans)).toThrow('must start at 6')
  })

  it('normalizes valid candidate plans and keeps adaptation notes arrays', () => {
    const plans = validateCandidateEpisodePlans(sourceText, validPlan())

    expect(plans).toHaveLength(1)
    expect(plans[0]?.episodes[0]).toMatchObject({
      provisionalNumber: 1,
      sourceStart: 0,
      sourceEnd: sourceText.length,
      endingHook: '钟声响起',
    })
    expect(plans[0]?.episodes[0]?.adaptationNotes.inferred).toEqual(['钟声可能提示危险'])
  })

  it('hashes normalized line endings consistently', () => {
    expect(hashChapterBatchSource('第一章\r\n内容')).toBe(hashChapterBatchSource('第一章\n内容'))
  })
})
