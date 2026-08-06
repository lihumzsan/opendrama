export type ScreenplayContentItem =
  | { type: 'action'; text: string }
  | { type: 'dialogue'; character: string; lines: string; parenthetical?: string }
  | { type: 'voiceover'; text: string; character?: string }

export type EpisodeScreenplayScene = {
  sceneNumber: number
  sourceStart: number
  sourceEnd: number
  sourceText: string
  heading: {
    intExt: string
    location: string
    time: string
  }
  entryState: string
  goal: string
  conflict: string
  outcome: string
  exitState: string
  content: ScreenplayContentItem[]
}

export type EpisodeScreenplay = {
  title: string
  scenes: EpisodeScreenplayScene[]
}

function requiredText(value: string, field: string, sceneNumber: number) {
  if (!value.trim()) {
    throw new Error(`scene ${sceneNumber} ${field} is required`)
  }
}

export function validateEpisodeScreenplay(
  screenplay: EpisodeScreenplay,
  sourceText: string,
): EpisodeScreenplay {
  if (!sourceText) throw new Error('source text is required')
  if (!Array.isArray(screenplay.scenes) || screenplay.scenes.length === 0) {
    throw new Error('screenplay scenes are required')
  }

  let expectedStart = 0
  const normalizedScenes = screenplay.scenes.map((scene, index) => {
    const sceneNumber = index + 1
    if (scene.sceneNumber !== sceneNumber) {
      throw new Error(`scene number must be ${sceneNumber}`)
    }
    if (scene.sourceStart !== expectedStart) {
      const kind = scene.sourceStart > expectedStart ? 'gap' : 'overlap'
      throw new Error(`source coverage ${kind} before scene ${sceneNumber}`)
    }
    if (scene.sourceEnd <= scene.sourceStart || scene.sourceEnd > sourceText.length) {
      throw new Error(`scene ${sceneNumber} has invalid source range`)
    }

    const expectedSourceText = sourceText.slice(scene.sourceStart, scene.sourceEnd)
    if (scene.sourceText !== expectedSourceText) {
      throw new Error(`scene ${sceneNumber} source text does not match source range`)
    }
    requiredText(scene.heading.intExt, 'heading.intExt', sceneNumber)
    requiredText(scene.heading.location, 'heading.location', sceneNumber)
    requiredText(scene.heading.time, 'heading.time', sceneNumber)
    requiredText(scene.entryState, 'entryState', sceneNumber)
    requiredText(scene.goal, 'goal', sceneNumber)
    requiredText(scene.conflict, 'conflict', sceneNumber)
    requiredText(scene.outcome, 'outcome', sceneNumber)
    requiredText(scene.exitState, 'exitState', sceneNumber)
    if (!Array.isArray(scene.content) || scene.content.length === 0) {
      throw new Error(`scene ${sceneNumber} content is required`)
    }

    expectedStart = scene.sourceEnd
    return scene
  })

  if (expectedStart !== sourceText.length) {
    throw new Error(`source coverage gap after scene ${normalizedScenes.length}`)
  }

  return {
    title: screenplay.title.trim(),
    scenes: normalizedScenes,
  }
}
