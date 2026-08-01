import { describe, expect, it } from 'vitest'

import {
  assembleSemanticEpisodes,
  buildEpisodeAnalysisBatches,
  buildEpisodeSourceUnits,
  classifyEpisodeSource,
  estimateEpisodeRuntimeMinutes,
  normalizeNarrativeScenes,
} from '@/lib/novel-promotion/semantic-episode-split'

describe('semantic episode source parsing', () => {
  it('recognizes indented novel paragraphs as separate source units', () => {
    const content = [
      '第一段。',
      '',
      '    第二段。',
      '',
      '    第三段。',
    ].join('\n')

    const units = buildEpisodeSourceUnits(content)

    expect(units).toHaveLength(3)
    expect(units.map((unit) => unit.text).join('')).toBe(content)
    expect(units[1]?.text).toBe('    第二段。\n\n')
  })

  it('keeps screenplay scenes intact and covers the exact source', () => {
    const content = [
      '1-1【王府·日】',
      '周生辰走入殿中。',
      '',
      '时宜',
      '师父。',
      '',
      '2-1【军营·夜】',
      '军报送达。',
    ].join('\n')

    expect(classifyEpisodeSource(content)).toBe('screenplay')

    const units = buildEpisodeSourceUnits(content)
    expect(units).toHaveLength(2)
    expect(units.map((unit) => content.slice(unit.startIndex, unit.endIndex)).join('')).toBe(content)
    expect(units[0]?.text).toContain('时宜\n师父。')
    expect(units[1]?.text).toContain('军报送达。')
  })

  it('uses natural paragraphs inside long chapters instead of fixed 400-word chunks', () => {
    const content = [
      '第一章 初遇',
      '山河故人重逢。'.repeat(180),
      '',
      '旧事尚未说尽。'.repeat(180),
      '',
      '第二章 风雨',
      '新的危机出现。'.repeat(180),
      '',
      '众人被迫作出选择。'.repeat(180),
    ].join('\n')

    expect(classifyEpisodeSource(content)).toBe('prose')

    const units = buildEpisodeSourceUnits(content)
    expect(units).toHaveLength(4)
    expect(units.every((unit) => unit.wordCount > 400)).toBe(true)
    expect(units.map((unit) => unit.text).join('')).toBe(content)
  })

  it('batches only between source units and preserves their order', () => {
    const content = [
      '第一章',
      '甲'.repeat(120),
      '',
      '第二章',
      '乙'.repeat(120),
      '',
      '第三章',
      '丙'.repeat(120),
    ].join('\n')
    const units = buildEpisodeSourceUnits(content)
    const batches = buildEpisodeAnalysisBatches(units, 180)

    expect(batches).toHaveLength(3)
    expect(batches.flatMap((batch) => batch.units).map((unit) => unit.id))
      .toEqual(units.map((unit) => unit.id))
  })

  it('uses word count only to estimate runtime', () => {
    const content = '山'.repeat(1_250)
    expect(estimateEpisodeRuntimeMinutes(content)).toBe(5)
  })
})

describe('semantic episode plan assembly', () => {
  const content = [
    '第一章 初遇',
    '周生辰与时宜在王府初见。',
    '',
    '第二章 军报',
    '边关急报打断了短暂的平静。',
    '',
    '第三章 决意',
    '周生辰决定立即出征。',
  ].join('\n')
  const units = buildEpisodeSourceUnits(content)
  const scenes = normalizeNarrativeScenes(units, [
    {
      startUnitId: 'unit_0001',
      endUnitId: 'unit_0001',
      title: '王府初见',
      summary: '两位主角第一次相见',
      characters: ['周生辰', '时宜'],
      goal: '建立人物关系',
      outcome: '彼此留下印象',
      boundaryAfter: { closure: 7, hook: 4, transition: 8, causalBreakPenalty: 1 },
    },
    {
      startUnitId: 'unit_0002',
      endUnitId: 'unit_0002',
      title: '军报突至',
      summary: '边关危机进入主线',
      characters: ['周生辰'],
      goal: '确认危机',
      outcome: '必须做出选择',
      boundaryAfter: { closure: 5, hook: 9, transition: 7, causalBreakPenalty: 1 },
    },
    {
      startUnitId: 'unit_0003',
      endUnitId: 'unit_0003',
      title: '决定出征',
      summary: '主人公承担使命',
      characters: ['周生辰'],
      goal: '回应边关危机',
      outcome: '踏上征途',
      boundaryAfter: { closure: 9, hook: 6, transition: 8, causalBreakPenalty: 0 },
    },
  ])

  it('assembles every source character exactly once', () => {
    const result = assembleSemanticEpisodes(content, scenes, {
      profile: 'horizontal_motion_comic',
      episodes: [
        {
          startSceneId: 'scene_001',
          endSceneId: 'scene_002',
          title: '相逢之后',
          summary: '相逢后危机突至',
          coreGoal: '建立关系并引出边关危机',
          dramaticArc: '相逢—缓和—危机',
          endingHook: '周生辰将如何选择',
          rationale: '军报构成自然的集尾问题',
        },
        {
          startSceneId: 'scene_003',
          endSceneId: 'scene_003',
          title: '再赴边关',
          summary: '周生辰决定出征',
          coreGoal: '完成主人公的关键选择',
          dramaticArc: '权衡—承诺—行动',
          endingHook: '征途即将开始',
          rationale: '完整保留决定出征的剧情节拍',
        },
      ],
    })

    expect(result.method).toBe('semantic')
    expect(result.episodes.map((episode) => episode.content).join('')).toBe(content)
    expect(result.episodes.flatMap((episode) => episode.sceneIds))
      .toEqual(['scene_001', 'scene_002', 'scene_003'])
  })

  it('rejects a plan that skips a scene', () => {
    expect(() => assembleSemanticEpisodes(content, scenes, {
      profile: 'horizontal_motion_comic',
      episodes: [
        {
          startSceneId: 'scene_001',
          endSceneId: 'scene_001',
          title: '初见',
          summary: '初见',
        },
        {
          startSceneId: 'scene_003',
          endSceneId: 'scene_003',
          title: '出征',
          summary: '出征',
        },
      ],
    })).toThrow('scene coverage gap')
  })

  it('allows a semantic episode to exceed 400 words', () => {
    const longContent = [
      '第一章',
      '山'.repeat(900),
      '',
      '第二章',
      '海'.repeat(900),
    ].join('\n')
    const longUnits = buildEpisodeSourceUnits(longContent)
    const longScenes = normalizeNarrativeScenes(longUnits, [
      { startUnitId: 'unit_0001', endUnitId: 'unit_0001', title: '山中' },
      { startUnitId: 'unit_0002', endUnitId: 'unit_0002', title: '海边' },
    ])
    const result = assembleSemanticEpisodes(longContent, longScenes, {
      profile: 'horizontal_motion_comic',
      episodes: [{
        startSceneId: 'scene_001',
        endSceneId: 'scene_002',
        title: '山海',
        summary: '山海之间的完整事件',
      }],
    })

    expect(result.episodes[0]?.wordCount).toBeGreaterThan(400)
    expect(result.episodes[0]?.content).toBe(longContent)
  })

  it('rejects scene analysis that leaves a source-unit gap', () => {
    expect(() => normalizeNarrativeScenes(units, [
      { startUnitId: 'unit_0001', endUnitId: 'unit_0001', title: '初见' },
      { startUnitId: 'unit_0003', endUnitId: 'unit_0003', title: '出征' },
    ])).toThrow('source unit coverage gap')
  })
})
