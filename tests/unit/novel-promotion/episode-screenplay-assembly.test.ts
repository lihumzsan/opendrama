import { describe, expect, it } from 'vitest'

import { assembleEpisodeScreenplay } from '@/lib/novel-promotion/screenplay/assembly'

describe('assembleEpisodeScreenplay', () => {
  it('turns ordered source anchors into one validated screenplay without a clip split', () => {
    const result = assembleEpisodeScreenplay('甲乙丙丁', {
      title: '第一集',
      scenes: [
        {
          startText: '甲乙',
          endText: '甲乙',
          heading: { intExt: 'INT', location: '诊室', time: '夜' },
          entryState: '问诊开始', goal: '完成问诊', conflict: '医生施压', outcome: '主角被留院', exitState: '主角离开诊室',
          content: [{ type: 'action', text: '医生合上病历。' }],
        },
        {
          startText: '丙丁',
          endText: '丙丁',
          heading: { intExt: 'INT', location: '病房', time: '夜' },
          entryState: '主角进入病房', goal: '寻找真相', conflict: '病人沉默', outcome: '得到线索', exitState: '主角决定追查',
          content: [{ type: 'dialogue', character: '主角', lines: '你是谁？' }],
        },
      ],
    })

    expect(result.title).toBe('第一集')
    expect(result.scenes.map((scene) => scene.sourceText).join('')).toBe('甲乙丙丁')
  })

  it('rejects an AI response whose anchors skip source text', () => {
    expect(() => assembleEpisodeScreenplay('甲乙丙丁', {
      title: '第一集',
      scenes: [{
        startText: '丙丁', endText: '丙丁',
        heading: { intExt: 'INT', location: '病房', time: '夜' },
        entryState: '进入病房', goal: '找人', conflict: '沉默', outcome: '获得线索', exitState: '决定追查',
        content: [{ type: 'action', text: '主角停下。' }],
      }],
    })).toThrow('source coverage gap')
  })

  it('assigns prose between two scene anchors to the preceding narrative scene', () => {
    const result = assembleEpisodeScreenplay('甲进门。过渡叙事。乙离开。', {
      title: '第一集',
      scenes: [
        {
          startText: '甲进门。', endText: '甲进门。',
          heading: { intExt: 'INT', location: '诊室', time: '日' },
          entryState: '候诊', goal: '问诊', conflict: '施压', outcome: '被留院', exitState: '离开诊室',
          content: [{ type: 'action', text: '甲进门。' }],
        },
        {
          startText: '乙离开。', endText: '乙离开。',
          heading: { intExt: 'INT', location: '走廊', time: '日' },
          entryState: '等候', goal: '拿消息', conflict: '回避', outcome: '得到线索', exitState: '离开走廊',
          content: [{ type: 'action', text: '乙离开。' }],
        },
      ],
    })

    expect(result.scenes.map((scene) => scene.sourceText).join('')).toBe('甲进门。过渡叙事。乙离开。')
    expect(result.scenes[0]?.sourceText).toBe('甲进门。过渡叙事。')
  })
})
