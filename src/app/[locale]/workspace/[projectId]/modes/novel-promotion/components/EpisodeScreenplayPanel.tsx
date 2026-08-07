'use client'

import {
  formatEpisodeSceneHeading,
  getEpisodeScreenplayNextAction,
} from '@/lib/novel-promotion/screenplay/display'

type Scene = {
  id: string
  sceneNumber: number
  heading: string
  entryState: string
  goal: string
  conflict: string
  outcome: string
  exitState: string
  content: string
}

type Props = {
  screenplay: { title: string; scenes?: Scene[] } | null
  isGeneratingStoryboard?: boolean
  onGenerateStoryboard?: () => void
}

function parseJson(value: string): unknown {
  try { return JSON.parse(value) } catch { return value }
}

function sceneContent(value: string): string | string[] {
  const parsed = parseJson(value)
  if (!Array.isArray(parsed)) return typeof parsed === 'string' ? parsed : value
  return parsed.map((item) => {
    if (!item || typeof item !== 'object') return ''
    const entry = item as Record<string, unknown>
    if (entry.type === 'dialogue') return `${String(entry.character || '')}：${String(entry.lines || '')}`
    return String(entry.text || '')
  }).filter(Boolean)
}

export default function EpisodeScreenplayPanel({
  screenplay,
  isGeneratingStoryboard = false,
  onGenerateStoryboard,
}: Props) {
  if (!screenplay) return <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">尚未生成整集剧本。</div>
  const nextAction = getEpisodeScreenplayNextAction({
    sceneCount: screenplay.scenes?.length || 0,
    isGenerating: isGeneratingStoryboard,
  })
  return (
    <section className="space-y-4">
      <header><h2 className="text-xl font-semibold">{screenplay.title}</h2><p className="text-sm text-muted-foreground">整集剧本 · 按叙事场景组织</p></header>
      {screenplay.scenes?.map((scene) => {
        const heading = parseJson(scene.heading)
        const content = sceneContent(scene.content)
        const headingText = typeof heading === 'object'
          ? formatEpisodeSceneHeading(JSON.stringify(heading))
          : formatEpisodeSceneHeading(String(heading))
        return <article key={scene.id} className="space-y-3 rounded-xl border bg-card p-5">
          <div className="font-medium">场 {scene.sceneNumber} · {headingText}</div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">入场：</span>{scene.entryState}</p><p><span className="text-muted-foreground">目标：</span>{scene.goal}</p>
            <p><span className="text-muted-foreground">冲突：</span>{scene.conflict}</p><p><span className="text-muted-foreground">结果：</span>{scene.outcome}</p>
          </div>
          <div className="space-y-2 whitespace-pre-wrap text-sm">{Array.isArray(content) ? content.map((line, index) => <p key={index}>{line}</p>) : content}</div>
        </article>
      })}
      {nextAction.visible && onGenerateStoryboard && (
        <div className="sticky bottom-4 flex justify-center pt-2">
          <button
            type="button"
            disabled={nextAction.disabled}
            onClick={onGenerateStoryboard}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {nextAction.label}
          </button>
        </div>
      )}
    </section>
  )
}
