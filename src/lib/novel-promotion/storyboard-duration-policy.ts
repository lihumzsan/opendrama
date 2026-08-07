import {
  COMFYUI_MINIMAX_H3_FL2VA_MODEL_KEY,
  COMFYUI_MINIMAX_H3_I2VA_MODEL_KEY,
  COMFYUI_MINIMAX_H3_MAX_DURATION_SECONDS,
  COMFYUI_MINIMAX_H3_MIN_DURATION_SECONDS,
} from '@/lib/providers/comfyui/minimax-h3'

export type StoryboardDurationPolicy = {
  minSeconds: number
  maxSeconds: number
}

const H3_DURATION_POLICY: StoryboardDurationPolicy = {
  minSeconds: COMFYUI_MINIMAX_H3_MIN_DURATION_SECONDS,
  maxSeconds: COMFYUI_MINIMAX_H3_MAX_DURATION_SECONDS,
}

function normalizeModelKey(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().replace(/^comfyui::/, '') : ''
}

export function resolveStoryboardDurationPolicy(
  videoModel: string | null | undefined,
): StoryboardDurationPolicy | null {
  const modelKey = normalizeModelKey(videoModel)
  if (
    modelKey === normalizeModelKey(COMFYUI_MINIMAX_H3_I2VA_MODEL_KEY)
    || modelKey === normalizeModelKey(COMFYUI_MINIMAX_H3_FL2VA_MODEL_KEY)
  ) {
    return H3_DURATION_POLICY
  }
  return null
}

export function normalizeStoryboardPanelDuration(
  duration: unknown,
  policy: StoryboardDurationPolicy | null,
): number | undefined {
  if (typeof duration !== 'number' || !Number.isFinite(duration)) return undefined
  if (!policy) return duration

  const rounded = Math.round(duration)
  return Math.min(policy.maxSeconds, Math.max(policy.minSeconds, rounded))
}

export function normalizeStoryboardPanelDurations<T extends { duration?: unknown }>(
  panels: T[],
  policy: StoryboardDurationPolicy | null | undefined,
): T[] {
  if (!policy) return panels
  return panels.map((panel) => {
    const duration = normalizeStoryboardPanelDuration(panel.duration, policy)
    return duration === undefined ? panel : { ...panel, duration }
  })
}

export function buildStoryboardDurationPromptBlock(
  policy: StoryboardDurationPolicy | null | undefined,
): string {
  if (!policy) return ''
  return `

Storyboard duration contract:
- Every panel must include duration as an integer number of seconds.
- duration must be an integer from ${policy.minSeconds}-${policy.maxSeconds} seconds inclusive.
- For short dialogue, preserve the exact dialogue beat and use natural pauses, reactions, or action transitions to fill the shot; do not change the meaning or merge different dialogue beats.`
}
