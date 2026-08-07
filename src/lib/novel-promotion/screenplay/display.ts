type StructuredSceneHeading = {
  intExt?: unknown
  location?: unknown
  time?: unknown
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function formatEpisodeSceneHeading(value: string): string {
  const fallback = value.trim()

  try {
    const parsed = JSON.parse(value) as StructuredSceneHeading
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback

    const intExt = readText(parsed.intExt)
    const setting = intExt === 'INT' ? '内景' : intExt === 'EXT' ? '外景' : ''
    const parts = [setting, readText(parsed.location), readText(parsed.time)].filter(Boolean)
    return parts.length > 0 ? parts.join(' · ') : fallback
  } catch {
    return fallback
  }
}

export function getEpisodeScreenplayNextAction(input: {
  sceneCount: number
  isGenerating: boolean
}) {
  return {
    visible: input.sceneCount > 0,
    label: input.isGenerating ? '分镜生成中…' : '确认剧本，生成分镜',
    disabled: input.isGenerating,
  }
}
