import { describe, expect, it } from 'vitest'
import { getKnowledgePromptContext } from '@/lib/knowledge-base/prompt-context'
import { buildPrompt, PROMPT_IDS, type PromptId } from '@/lib/prompt-i18n'

type KnowledgePromptCase = {
  promptId: PromptId
  kind: Parameters<typeof getKnowledgePromptContext>[0]
  variables: Record<string, string>
}

const knowledgePromptCases: KnowledgePromptCase[] = [
  {
    promptId: PROMPT_IDS.NP_AGENT_CHARACTER_VISUAL,
    kind: 'character_visual',
    variables: {
      character_profiles: '[{"name":"Hero"}]',
    },
  },
  {
    promptId: PROMPT_IDS.NP_AGENT_ACTING_DIRECTION,
    kind: 'acting_direction',
    variables: {
      panels_json: '[{"panel_number":1}]',
      panel_count: '1',
      characters_info: 'Hero, female adult',
    },
  },
  {
    promptId: PROMPT_IDS.NP_AGENT_STORYBOARD_DETAIL,
    kind: 'storyboard_detail',
    variables: {
      panels_json: '[{"panel_number":1}]',
      characters_age_gender: 'Hero, female adult',
      locations_description: 'Interior room',
      props_description: '[]',
    },
  },
  {
    promptId: PROMPT_IDS.NP_FIRST_LAST_FRAME_TRANSITION,
    kind: 'h3_prompt',
    variables: {
      first_panel_context: '{"description":"start"}',
      last_panel_context: '{"description":"end"}',
      duration_seconds: '8',
      fps: '24',
      workflow_key: 'comfyui::basevideo/minimax-h3/h3-fl2va',
    },
  },
]

describe('knowledge-base prompt rendering', () => {
  it.each(knowledgePromptCases)('injects recommendation context into %s templates', ({ promptId, kind, variables }) => {
    const prompt = buildPrompt({
      promptId,
      locale: 'zh',
      variables: {
        ...variables,
        knowledge_context: getKnowledgePromptContext(kind),
      },
    })

    expect(prompt).toContain('preference guidance only')
    expect(prompt).toContain('Do not override explicit user instructions')
    expect(prompt).not.toContain('{knowledge_context}')
  })
})
