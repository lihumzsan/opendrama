import { expect, it } from 'vitest'

import { toScreenplaySource } from '@/lib/novel-promotion/screenplay/source'

it('removes chapter headings but preserves the complete shootable body', () => {
  expect(toScreenplaySource('第1章 归零\n\n洛城，秋。\n\n陈迹坐在诊室。'))
    .toBe('洛城，秋。\n\n陈迹坐在诊室。')
})
