import type {
  EpisodeScreenplay,
  EpisodeScreenplayScene,
  ScreenplayContentItem,
} from './validation'

export type StoryboardClipInput = {
  start: number
  end: number
  duration: null
  summary: string
  location: string
  content: string
  characters: string
  props: string
  startText: string
  endText: string
  shotCount: null
  screenplay: string
}

export type StoredEpisodeScreenplayScene = Omit<EpisodeScreenplayScene, 'heading' | 'content'> & {
  heading: string
  content: string
}

function collectCharacterNames(content: ScreenplayContentItem[]) {
  const names = new Set<string>()
  for (const item of content) {
    if (item.type !== 'dialogue' && item.type !== 'voiceover') continue
    const name = item.character?.trim()
    if (name) names.add(name)
  }
  return [...names]
}

function toStoryboardClip(scene: EpisodeScreenplayScene): StoryboardClipInput {
  const characters = collectCharacterNames(scene.content)
  return {
    start: scene.sourceStart,
    end: scene.sourceEnd,
    duration: null,
    summary: scene.outcome,
    location: scene.heading.location,
    content: scene.sourceText,
    characters: JSON.stringify(characters),
    props: JSON.stringify([]),
    startText: scene.entryState,
    endText: scene.exitState,
    shotCount: null,
    screenplay: JSON.stringify({
      clip_id: `scene-${scene.sceneNumber}`,
      original_text: scene.sourceText,
      scenes: [{
        scene_number: scene.sceneNumber,
        heading: {
          int_ext: scene.heading.intExt,
          location: scene.heading.location,
          time: scene.heading.time,
        },
        description: scene.goal,
        characters,
        content: scene.content,
      }],
    }),
  }
}

export function buildStoryboardClipsFromEpisodeScreenplay(screenplay: EpisodeScreenplay): StoryboardClipInput[] {
  return screenplay.scenes.map(toStoryboardClip)
}

function parseStoredScene(scene: StoredEpisodeScreenplayScene): EpisodeScreenplayScene {
  try {
    const heading = JSON.parse(scene.heading) as EpisodeScreenplayScene['heading']
    const content = JSON.parse(scene.content) as ScreenplayContentItem[]
    if (!heading || typeof heading !== 'object' || Array.isArray(heading) || !Array.isArray(content)) {
      throw new Error('invalid structured fields')
    }
    return { ...scene, heading, content }
  } catch (error) {
    throw new Error(
      `Invalid persisted screenplay scene ${scene.sceneNumber}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export function buildStoryboardClipsFromStoredScreenplayScenes(
  scenes: StoredEpisodeScreenplayScene[],
): StoryboardClipInput[] {
  return scenes.map((scene) => toStoryboardClip(parseStoredScene(scene)))
}
