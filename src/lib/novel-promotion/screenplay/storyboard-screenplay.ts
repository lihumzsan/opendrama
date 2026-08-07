export type StoryboardScreenplayScene = {
  scene_number: number
  heading: {
    int_ext: string
    location: string
    time: string
  } | string
  description?: string
  characters?: string[]
  content: Array<{
    type: 'action' | 'dialogue' | 'voiceover'
    text?: string
    character?: string
    lines?: string
    parenthetical?: string
  }>
}

export type StoryboardScreenplay = {
  clip_id: string
  original_text?: string
  scenes: StoryboardScreenplayScene[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isScene(value: unknown): value is StoryboardScreenplayScene {
  return isRecord(value)
    && typeof value.scene_number === 'number'
    && (typeof value.heading === 'string' || isRecord(value.heading))
    && Array.isArray(value.content)
}

export function parseStoryboardScreenplay(value: string | null): StoryboardScreenplay | null {
  if (!value) return null

  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed) || typeof parsed.clip_id !== 'string' || !Array.isArray(parsed.scenes)) {
      return null
    }
    if (!parsed.scenes.every(isScene)) return null
    return parsed as StoryboardScreenplay
  } catch {
    return null
  }
}
