import { describe, expect, it } from 'vitest'

import {
  validateEpisodeScreenplay,
  type EpisodeScreenplay,
} from '@/lib/novel-promotion/screenplay/validation'

const sourceText = '甲乙丙丁'

function screenplay(overrides: Partial<EpisodeScreenplay> = {}): EpisodeScreenplay {
  return {
    title: '第一集',
    scenes: [
      {
        sceneNumber: 1,
        sourceStart: 0,
        sourceEnd: 2,
        sourceText: '甲乙',
        heading: { intExt: 'INT', location: '诊室', time: '夜' },
        entryState: '主角正在接受问诊',
        goal: '完成问诊',
        conflict: '医生试图误导主角',
        outcome: '主角被留院',
        exitState: '主角被送往病房',
        content: [{ type: 'action', text: '主角看向医生。' }],
      },
      {
        sceneNumber: 2,
        sourceStart: 2,
        sourceEnd: 4,
        sourceText: '丙丁',
        heading: { intExt: 'INT', location: '病房', time: '夜' },
        entryState: '主角进入病房',
        goal: '寻找真相',
        conflict: '病人阻挡去路',
        outcome: '主角得到线索',
        exitState: '主角决定继续追查',
        content: [{ type: 'dialogue', character: '主角', lines: '你是谁？' }],
      },
    ],
    ...overrides,
  }
}

describe('validateEpisodeScreenplay', () => {
  it('returns ordered scenes that cover the episode source exactly once', () => {
    const result = validateEpisodeScreenplay(screenplay(), sourceText)

    expect(result.scenes.map((scene) => scene.sourceText).join('')).toBe('甲乙丙丁')
    expect(result.scenes.map((scene) => scene.sceneNumber)).toEqual([1, 2])
  })

  it('rejects a scene plan that leaves source text between scenes uncovered', () => {
    const invalid = screenplay({
      scenes: [
        screenplay().scenes[0],
        { ...screenplay().scenes[1], sourceStart: 3, sourceText: '丁' },
      ],
    })

    expect(() => validateEpisodeScreenplay(invalid, sourceText)).toThrow('source coverage gap')
  })

  it('rejects a scene without an entry state', () => {
    const invalid = screenplay({
      scenes: [{ ...screenplay().scenes[0], entryState: '' }, screenplay().scenes[1]],
    })

    expect(() => validateEpisodeScreenplay(invalid, sourceText)).toThrow('entryState is required')
  })
})
