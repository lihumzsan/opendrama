import { describe, expect, it } from 'vitest'

import { mapChapterBatchPlanToSplitEpisodes } from '@/app/[locale]/workspace/[projectId]/modes/novel-promotion/components/smart-import/chapter-batch-mapping'

describe('chapter batch preview mapping', () => {
  it('maps candidate episodes into existing smart import preview episodes', () => {
    const episodes = mapChapterBatchPlanToSplitEpisodes({
      planId: 'one-episode',
      title: '一集版',
      rationale: '完整一集',
      episodes: [{
        provisionalNumber: 3,
        name: '第三集',
        description: '进入新环境',
        sourceStart: 0,
        sourceEnd: 6,
        sourceText: '甲乙丙',
        coreGoal: '探索',
        dramaticArc: '进入-发现',
        endingHook: '门开了',
        adaptationNotes: {
          keep: [],
          merge: [],
          remove: [],
          externalize: [],
          inferred: [],
        },
      }],
    })

    expect(episodes).toEqual([{
      number: 3,
      title: '第三集',
      summary: '进入新环境',
      content: '甲乙丙',
      wordCount: 3,
      coreGoal: '探索',
      dramaticArc: '进入-发现',
      endingHook: '门开了',
      rationale: '完整一集',
    }])
  })
})
