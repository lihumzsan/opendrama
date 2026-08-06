import { createClipContentMatcher } from '@/lib/novel-promotion/story-to-script/clip-matching'

import type { EpisodeScreenplay, EpisodeScreenplayScene } from './validation'
import { validateEpisodeScreenplay } from './validation'

type AnchoredScene = Omit<
  EpisodeScreenplayScene,
  'sceneNumber' | 'sourceStart' | 'sourceEnd' | 'sourceText'
> & {
  startText: string
  endText: string
}

export type AnchoredEpisodeScreenplay = {
  title: string
  scenes: AnchoredScene[]
}

function matchSceneRange(sourceText: string, scene: AnchoredScene, fromIndex: number) {
  const startText = scene.startText.trim()
  const endText = scene.endText.trim()
  if (!startText || !endText) return null

  // A one-anchor scene is useful for very short scenes and must include that
  // anchor itself; the shared boundary matcher searches for a later end anchor.
  if (startText === endText) {
    const startIndex = sourceText.indexOf(startText, fromIndex)
    return startIndex === -1
      ? null
      : { startIndex, endIndex: startIndex + startText.length }
  }

  return createClipContentMatcher(sourceText).matchBoundary(startText, endText, fromIndex)
}

export function assembleEpisodeScreenplay(
  sourceText: string,
  response: AnchoredEpisodeScreenplay,
): EpisodeScreenplay {
  let searchFrom = 0
  const matches = response.scenes.map((scene, index) => {
    const match = matchSceneRange(sourceText, scene, searchFrom)
    if (!match) {
      throw new Error(`scene ${index + 1} source anchors cannot be matched`)
    }

    searchFrom = match.endIndex
    return match
  })

  const scenes = response.scenes.map((scene, index) => {
    const match = matches[index]
    if (!match) throw new Error(`scene ${index + 1} source anchors cannot be matched`)
    // The next scene's start anchor is the authoritative boundary. Any prose
    // between adjacent anchors belongs to the preceding narrative scene.
    const sourceEnd = index < matches.length - 1
      ? (matches[index + 1]?.startIndex ?? match.endIndex)
      : match.endIndex
    return {
      sceneNumber: index + 1,
      sourceStart: match.startIndex,
      sourceEnd,
      sourceText: sourceText.slice(match.startIndex, sourceEnd),
      heading: scene.heading,
      entryState: scene.entryState,
      goal: scene.goal,
      conflict: scene.conflict,
      outcome: scene.outcome,
      exitState: scene.exitState,
      content: scene.content,
    }
  })

  return validateEpisodeScreenplay({ title: response.title, scenes }, sourceText)
}
