import { describe, expect, it } from 'vitest'

import { parseStoryboardScreenplay } from '@/lib/novel-promotion/screenplay/storyboard-screenplay'

describe('storyboard screenplay parser', () => {
  it('accepts the structured screenplay shape used by the storyboard display', () => {
    expect(parseStoryboardScreenplay(JSON.stringify({
      clip_id: 'scene-1',
      scenes: [{ scene_number: 1, heading: 'INT. 医生办公室 - 夜', content: [] }],
    }))).toMatchObject({
      clip_id: 'scene-1',
      scenes: [{ scene_number: 1 }],
    })
  })

  it('rejects legacy raw content arrays instead of letting the display crash', () => {
    expect(parseStoryboardScreenplay(JSON.stringify([
      { type: 'dialogue', character: '陈迹', lines: '我没事。' },
    ]))).toBeNull()
  })
})
