import { describe, expect, it } from 'vitest'

import {
  buildStoryboardClipsFromEpisodeScreenplay,
  buildStoryboardClipsFromStoredScreenplayScenes,
} from '@/lib/novel-promotion/screenplay/to-storyboard-clips'

describe('episode screenplay storyboard clips', () => {
  it('materializes one storyboard input clip per screenplay scene', () => {
    const clips = buildStoryboardClipsFromEpisodeScreenplay({
      title: '测试剧集',
      scenes: [{
        sceneNumber: 1,
        sourceStart: 0,
        sourceEnd: 12,
        sourceText: '医生询问，陈迹回答。',
        heading: { intExt: 'INT', location: '医生办公室', time: '夜间' },
        entryState: '陈迹平静坐下。',
        goal: '医生完成评估。',
        conflict: '陈迹的回答透着异常。',
        outcome: '医生决定留观。',
        exitState: '医生记录诊断。',
        content: [
          { type: 'action', text: '医生翻看问卷。' },
          { type: 'dialogue', character: '医生老刘', lines: '你还好吗？' },
          { type: 'dialogue', character: '陈迹', lines: '我没事。' },
          { type: 'voiceover', character: '陈迹', text: '他没有说实话。' },
        ],
      }],
    })

    expect(clips).toEqual([{
      start: 0,
      end: 12,
      duration: null,
      summary: '医生决定留观。',
      location: '医生办公室',
      content: '医生询问，陈迹回答。',
      characters: JSON.stringify(['医生老刘', '陈迹']),
      props: JSON.stringify([]),
      startText: '陈迹平静坐下。',
      endText: '医生记录诊断。',
      shotCount: null,
      screenplay: JSON.stringify({
        clip_id: 'scene-1',
        original_text: '医生询问，陈迹回答。',
        scenes: [{
          scene_number: 1,
          heading: { int_ext: 'INT', location: '医生办公室', time: '夜间' },
          description: '医生完成评估。',
          characters: ['医生老刘', '陈迹'],
          content: [
            { type: 'action', text: '医生翻看问卷。' },
            { type: 'dialogue', character: '医生老刘', lines: '你还好吗？' },
            { type: 'dialogue', character: '陈迹', lines: '我没事。' },
            { type: 'voiceover', character: '陈迹', text: '他没有说实话。' },
          ],
        }],
      }),
    }])
  })

  it('does not add blank or duplicate character names', () => {
    const [clip] = buildStoryboardClipsFromEpisodeScreenplay({
      title: '测试剧集',
      scenes: [{
        sceneNumber: 1,
        sourceStart: 0,
        sourceEnd: 1,
        sourceText: 'A',
        heading: { intExt: 'EXT', location: '天台', time: '清晨' },
        entryState: '开始', goal: '目标', conflict: '冲突', outcome: '结果', exitState: '结束',
        content: [
          { type: 'dialogue', character: '陈迹', lines: '你好。' },
          { type: 'voiceover', character: ' 陈迹 ', text: '旁白。' },
          { type: 'voiceover', text: '无署名旁白。' },
        ],
      }],
    })

    expect(clip.characters).toBe(JSON.stringify(['陈迹']))
  })

  it('rebuilds storyboard inputs from persisted screenplay scenes', () => {
    const [clip] = buildStoryboardClipsFromStoredScreenplayScenes([{
      sceneNumber: 1,
      sourceStart: 0,
      sourceEnd: 3,
      sourceText: '原文。',
      heading: JSON.stringify({ intExt: 'INT', location: '病房', time: '深夜' }),
      entryState: '开始', goal: '目标', conflict: '冲突', outcome: '结果', exitState: '结束',
      content: JSON.stringify([{ type: 'dialogue', character: '陈迹', lines: '我醒着。' }]),
    }])

    expect(clip).toMatchObject({
      location: '病房',
      content: '原文。',
      characters: JSON.stringify(['陈迹']),
    })
  })
})
