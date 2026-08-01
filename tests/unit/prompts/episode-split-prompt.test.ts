import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'

const promptDir = join(process.cwd(), 'lib', 'prompts', 'novel-promotion')

function readPrompt(filename: string) {
  return readFileSync(join(promptDir, filename), 'utf8')
}

describe('semantic episode split prompts', () => {
  it.each(['zh', 'en'])('defines scene analysis and global planning in %s', (locale) => {
    const scenePrompt = readPrompt(`episode_scene_analysis.${locale}.txt`)
    const planPrompt = readPrompt(`episode_plan.${locale}.txt`)

    expect(scenePrompt).toContain('{{UNIT_JSON}}')
    expect(scenePrompt).toContain('startUnitId')
    expect(scenePrompt).toContain('endUnitId')
    expect(scenePrompt).toContain('boundaryAfter')

    expect(planPrompt).toContain('{{SCENE_JSON}}')
    expect(planPrompt).toContain('{{REPAIR_CONTEXT}}')
    expect(planPrompt).toContain('horizontal_motion_comic')
    expect(planPrompt).toContain('regular_episode')
    expect(planPrompt).toContain('startSceneId')
    expect(planPrompt).toContain('endSceneId')
  })

  it.each(['zh', 'en'])('does not impose a fixed word limit in %s', (locale) => {
    const scenePrompt = readPrompt(`episode_scene_analysis.${locale}.txt`)
    const planPrompt = readPrompt(`episode_plan.${locale}.txt`)

    expect(scenePrompt).not.toContain('400')
    expect(planPrompt).not.toContain('400')
  })
})
