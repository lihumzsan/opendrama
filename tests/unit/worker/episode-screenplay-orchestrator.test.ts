import { describe, expect, it, vi } from 'vitest'

import { runEpisodeScreenplayOrchestrator } from '@/lib/novel-promotion/story-to-script/episode-orchestrator'

describe('episode screenplay orchestrator', () => {
  it('plans one continuous episode screenplay, then writes each narrative scene in order', async () => {
    const actionOrder: string[] = []
    const runStep = vi.fn(async (_meta, _prompt, action: string) => {
      actionOrder.push(action)
      if (action === 'analyze_characters') return { text: '{"characters":[{"name":"甲","introduction":"主角"}]}', reasoning: '' }
      if (action === 'analyze_locations') return { text: '{"locations":[{"name":"诊室"}]}', reasoning: '' }
      if (action === 'analyze_props') return { text: '{"props":[]}', reasoning: '' }
      if (action === 'plan_episode_scenes') {
        return {
          text: JSON.stringify({
            title: '第一集',
            scenes: [
              {
                startText: '甲进入诊室', endText: '医生合上病历。',
                heading: { intExt: 'INT', location: '诊室', time: '日' },
                entryState: '甲在候诊', goal: '完成问诊', conflict: '医生施压', outcome: '甲被留院', exitState: '甲离开诊室',
              },
              {
                startText: '乙在走廊等候', endText: '乙转身离开。',
                heading: { intExt: 'INT', location: '走廊', time: '日' },
                entryState: '乙在走廊', goal: '拿到消息', conflict: '对方回避', outcome: '乙得到线索', exitState: '乙决定追查',
              },
            ],
          }),
          reasoning: '',
        }
      }
      if (action === 'screenplay_scene') {
        return { text: '{"content":[{"type":"action","text":"人物推进剧情。"}]}', reasoning: '' }
      }
      throw new Error(`unexpected action ${action}`)
    })

    const result = await runEpisodeScreenplayOrchestrator({
      content: '甲进入诊室，医生合上病历。乙在走廊等候，乙转身离开。',
      baseCharacters: [], baseLocations: [], baseProps: [], baseCharacterIntroductions: [],
      promptTemplates: {
        characterPromptTemplate: '{input}', locationPromptTemplate: '{input}', propPromptTemplate: '{input}',
        scenePlanPromptTemplate: '{input} {characters_lib_name} {locations_lib_name}',
        sceneScreenplayPromptTemplate: '{scene_source} {scene_number} {previous_exit_state}',
      },
      runStep,
    })

    expect(result.screenplay.scenes.map((scene) => scene.sourceText).join('')).toBe('甲进入诊室，医生合上病历。乙在走廊等候，乙转身离开。')
    expect(result.screenplay.scenes).toHaveLength(2)
    expect(actionOrder).toEqual([
      'analyze_characters', 'analyze_locations', 'analyze_props',
      'plan_episode_scenes', 'screenplay_scene', 'screenplay_scene',
    ])
    expect(runStep.mock.calls.map(([meta]) => ({
      stepId: meta.stepId,
      stepIndex: meta.stepIndex,
      stepTotal: meta.stepTotal,
    }))).toEqual([
      { stepId: 'analyze_characters', stepIndex: 1, stepTotal: 4 },
      { stepId: 'analyze_locations', stepIndex: 2, stepTotal: 4 },
      { stepId: 'analyze_props', stepIndex: 3, stepTotal: 4 },
      { stepId: 'plan_episode_scenes', stepIndex: 4, stepTotal: 4 },
      { stepId: 'screenplay_scene_1', stepIndex: 5, stepTotal: 6 },
      { stepId: 'screenplay_scene_2', stepIndex: 6, stepTotal: 6 },
    ])
  })

  it('rejects a plan that leaves source text uncovered before screenplay writing begins', async () => {
    const runStep = vi.fn(async (_meta, _prompt, action: string) => {
      if (action === 'analyze_characters') return { text: '{"characters":[]}', reasoning: '' }
      if (action === 'analyze_locations') return { text: '{"locations":[]}', reasoning: '' }
      if (action === 'analyze_props') return { text: '{"props":[]}', reasoning: '' }
      return {
        text: '{"title":"第一集","scenes":[{"startText":"乙", "endText":"乙", "heading":{"intExt":"INT","location":"走廊","time":"日"},"entryState":"等候","goal":"找人","conflict":"回避","outcome":"得到线索","exitState":"追查"}]}',
        reasoning: '',
      }
    })

    await expect(runEpisodeScreenplayOrchestrator({
      content: '甲乙', baseCharacters: [], baseLocations: [], baseCharacterIntroductions: [],
      promptTemplates: {
        characterPromptTemplate: '{input}', locationPromptTemplate: '{input}', propPromptTemplate: '{input}',
        scenePlanPromptTemplate: '{input}', sceneScreenplayPromptTemplate: '{scene_source}',
      }, runStep,
    })).rejects.toThrow('source coverage gap')
    expect(runStep).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), 'screenplay_scene', expect.anything())
  })
})
