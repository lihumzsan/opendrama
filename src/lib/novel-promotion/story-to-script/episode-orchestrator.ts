import { safeParseJsonObject } from '@/lib/json-repair'
import { buildCharactersIntroduction } from '@/lib/constants'

import { assembleEpisodeScreenplay, type AnchoredEpisodeScreenplay } from '../screenplay/assembly'
import type { EpisodeScreenplay, ScreenplayContentItem } from '../screenplay/validation'

export type EpisodeScreenplayStepMeta = {
  stepId: string
  stepTitle: string
  stepIndex: number
  stepTotal: number
  dependsOn?: string[]
  retryable?: boolean
}

export type EpisodeScreenplayStepOutput = { text: string; reasoning: string }

export type EpisodeScreenplayPromptTemplates = {
  characterPromptTemplate: string
  locationPromptTemplate: string
  propPromptTemplate: string
  scenePlanPromptTemplate: string
  sceneScreenplayPromptTemplate: string
}

export type EpisodeScreenplayOrchestratorInput = {
  content: string
  baseCharacters: string[]
  baseLocations: string[]
  baseProps?: string[]
  baseCharacterIntroductions: Array<{ name: string; introduction?: string | null }>
  promptTemplates: EpisodeScreenplayPromptTemplates
  runStep: (
    meta: EpisodeScreenplayStepMeta,
    prompt: string,
    action: string,
    maxOutputTokens: number,
  ) => Promise<EpisodeScreenplayStepOutput>
}

export type EpisodeScreenplayOrchestratorResult = {
  charactersObject: Record<string, unknown>
  locationsObject: Record<string, unknown>
  propsObject: Record<string, unknown>
  analyzedCharacters: Record<string, unknown>[]
  analyzedLocations: Record<string, unknown>[]
  analyzedProps: Record<string, unknown>[]
  screenplay: EpisodeScreenplay
}

function applyTemplate(template: string, replacements: Record<string, string>) {
  let next = template
  for (const [key, value] of Object.entries(replacements)) {
    next = next.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return next
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    : []
}

function analyzeCharacters(value: Record<string, unknown>) {
  const characters = asObjectArray(value.characters)
  return characters.length > 0 ? characters : asObjectArray(value.new_characters)
}

function validateContent(value: unknown, sceneNumber: number): ScreenplayContentItem[] {
  const items = asObjectArray(value)
  if (items.length === 0) throw new Error(`scene ${sceneNumber} screenplay content is required`)

  return items.map((item) => {
    const type = asString(item.type)
    if (type === 'action' && asString(item.text).trim()) return { type, text: asString(item.text).trim() }
    if (type === 'voiceover' && asString(item.text).trim()) {
      const character = asString(item.character).trim()
      return character ? { type, text: asString(item.text).trim(), character } : { type, text: asString(item.text).trim() }
    }
    if (type === 'dialogue' && asString(item.character).trim() && asString(item.lines).trim()) {
      const parenthetical = asString(item.parenthetical).trim()
      return parenthetical
        ? { type, character: asString(item.character).trim(), lines: asString(item.lines).trim(), parenthetical }
        : { type, character: asString(item.character).trim(), lines: asString(item.lines).trim() }
    }
    throw new Error(`scene ${sceneNumber} has invalid screenplay content`)
  })
}

export async function runEpisodeScreenplayOrchestrator(
  input: EpisodeScreenplayOrchestratorInput,
): Promise<EpisodeScreenplayOrchestratorResult> {
  const content = input.content.trim()
  if (!content) throw new Error('content is required')
  const baseCharactersText = input.baseCharacters.join('、') || '暂无'
  const baseLocationsText = input.baseLocations.join('、') || '暂无'
  const basePropsText = (input.baseProps || []).join('、') || '暂无'
  const charactersIntroduction = buildCharactersIntroduction(input.baseCharacterIntroductions) || '暂无角色介绍'

  const [characterResult, locationResult, propResult] = await Promise.all([
    input.runStep({ stepId: 'analyze_characters', stepTitle: 'progress.streamStep.analyzeCharacters', stepIndex: 1, stepTotal: 4, retryable: true }, applyTemplate(input.promptTemplates.characterPromptTemplate, { input: content, characters_lib_name: baseCharactersText, characters_lib_info: charactersIntroduction }), 'analyze_characters', 2200),
    input.runStep({ stepId: 'analyze_locations', stepTitle: 'progress.streamStep.analyzeLocations', stepIndex: 2, stepTotal: 4, retryable: true }, applyTemplate(input.promptTemplates.locationPromptTemplate, { input: content, locations_lib_name: baseLocationsText }), 'analyze_locations', 2200),
    input.runStep({ stepId: 'analyze_props', stepTitle: 'progress.streamStep.analyzeProps', stepIndex: 3, stepTotal: 4, retryable: true }, applyTemplate(input.promptTemplates.propPromptTemplate, { input: content, props_lib_name: basePropsText }), 'analyze_props', 1600),
  ])
  const charactersObject = safeParseJsonObject(characterResult.text)
  const locationsObject = safeParseJsonObject(locationResult.text)
  const propsObject = safeParseJsonObject(propResult.text)
  const analyzedCharacters = analyzeCharacters(charactersObject)
  const analyzedLocations = asObjectArray(locationsObject.locations)
  const analyzedProps = asObjectArray(propsObject.props)

  const characterNames = analyzedCharacters.map((item) => asString(item.name).trim()).filter(Boolean)
  const locationNames = analyzedLocations.map((item) => asString(item.name).trim()).filter(Boolean)
  const propNames = analyzedProps.map((item) => asString(item.name).trim()).filter(Boolean)
  const scenePlanPrompt = applyTemplate(input.promptTemplates.scenePlanPromptTemplate, {
    input: content,
    characters_lib_name: [...characterNames, ...input.baseCharacters].join('、') || '暂无',
    locations_lib_name: [...locationNames, ...input.baseLocations].join('、') || '暂无',
    props_lib_name: [...propNames, ...(input.baseProps || [])].join('、') || '暂无',
    characters_introduction: charactersIntroduction,
  })
  const scenePlanResult = await input.runStep(
    { stepId: 'plan_episode_scenes', stepTitle: 'progress.streamStep.planEpisodeScenes', stepIndex: 4, stepTotal: 4, dependsOn: ['analyze_characters', 'analyze_locations', 'analyze_props'], retryable: true },
    scenePlanPrompt,
    'plan_episode_scenes',
    3000,
  )
  const plan = safeParseJsonObject(scenePlanResult.text) as unknown as AnchoredEpisodeScreenplay
  const placeholderPlan: AnchoredEpisodeScreenplay = {
    title: asString(plan.title),
    scenes: Array.isArray(plan.scenes)
      ? plan.scenes.map((scene) => ({ ...(scene as Omit<AnchoredEpisodeScreenplay['scenes'][number], 'content'>), content: [{ type: 'action', text: '场景计划占位' }] }))
      : [],
  }
  const plannedScreenplay = assembleEpisodeScreenplay(content, placeholderPlan)

  const scenes = [] as EpisodeScreenplay['scenes']
  let previousExitState = '无'
  for (const plannedScene of plannedScreenplay.scenes) {
    const scenePrompt = applyTemplate(input.promptTemplates.sceneScreenplayPromptTemplate, {
      scene_number: String(plannedScene.sceneNumber),
      scene_source: plannedScene.sourceText,
      scene_heading: `${plannedScene.heading.intExt}. ${plannedScene.heading.location} - ${plannedScene.heading.time}`,
      entry_state: plannedScene.entryState,
      goal: plannedScene.goal,
      conflict: plannedScene.conflict,
      outcome: plannedScene.outcome,
      exit_state: plannedScene.exitState,
      previous_exit_state: previousExitState,
      characters_lib_name: characterNames.join('、') || baseCharactersText,
      locations_lib_name: locationNames.join('、') || baseLocationsText,
      props_lib_name: propNames.join('、') || basePropsText,
      characters_introduction: charactersIntroduction,
    })
    const sceneResult = await input.runStep(
      { stepId: `screenplay_scene_${plannedScene.sceneNumber}`, stepTitle: 'progress.streamStep.screenplayConversion', stepIndex: 4 + plannedScene.sceneNumber, stepTotal: 4 + plannedScreenplay.scenes.length, dependsOn: ['plan_episode_scenes'], retryable: true },
      scenePrompt,
      'screenplay_scene',
      2600,
    )
    const scenePayload = safeParseJsonObject(sceneResult.text)
    scenes.push({ ...plannedScene, content: validateContent(scenePayload.content, plannedScene.sceneNumber) })
    previousExitState = plannedScene.exitState
  }

  return { charactersObject, locationsObject, propsObject, analyzedCharacters, analyzedLocations, analyzedProps, screenplay: { title: plannedScreenplay.title, scenes } }
}
