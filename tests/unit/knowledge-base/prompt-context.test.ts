import { describe, expect, it } from 'vitest'
import { getKnowledgePromptContext, KNOWLEDGE_CONTEXT_KINDS } from '@/lib/knowledge-base/prompt-context'

describe('knowledge-base prompt context', () => {
  it('marks every knowledge context as recommendation-only guidance', () => {
    for (const kind of KNOWLEDGE_CONTEXT_KINDS) {
      const context = getKnowledgePromptContext(kind)

      expect(context).toContain('preference guidance only')
      expect(context).toContain('Do not override explicit user instructions')
      expect(context).toContain('preserve existing assets')
    }
  })

  it('keeps H3 guidance focused on one continuous plausible motion', () => {
    const context = getKnowledgePromptContext('h3_prompt')

    expect(context).toContain('one main motion')
    expect(context).toContain('no shot-scale jumps')
    expect(context).toContain('preserve visible identity')
    expect(context.length).toBeLessThanOrEqual(2500)
  })

  it('captures MiniMax H3 prompt protocol and audio-layer guidance', () => {
    const context = getKnowledgePromptContext('h3_prompt')

    expect(context).toContain('integrated_multimodal_description')
    expect(context).toContain('overall_soundscape')
    expect(context).toContain('non_diegetic_music')
    expect(context).toContain('anchor Picture 1')
    expect(context).toContain('settle into Picture 2')
    expect(context).toContain('movement type with amplitude and speed')
    expect(context).toContain('timed beats')
    expect(context).toContain('From 0.00 to')
    expect(context).toContain('not as cuts')
    expect(context).toContain('soundscape is for environment')
  })

  it('keeps character guidance useful without forcing template faces', () => {
    const context = getKnowledgePromptContext('character_visual')

    expect(context).toContain('adult boundary')
    expect(context).toContain('face profile')
    expect(context).toContain('hairstyle')
    expect(context).toContain('avoid same-face repetition')
  })
})
