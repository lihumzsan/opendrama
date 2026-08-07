import type { CapabilityValue } from '@/lib/model-config-contract'
import type { EffectiveVideoCapabilityDefinition } from '@/lib/model-capabilities/video-effective'
import { isComfyUiLtx23KjPromptRelayWorkflow } from '@/lib/providers/comfyui/ltx23-workflow-profiles'
import {
  normalizeStoryboardPanelDuration,
  resolveStoryboardDurationPolicy,
} from '@/lib/novel-promotion/storyboard-duration-policy'

interface RecommendedVideoDurationInput {
  modelKey: string
  recommendedDuration: unknown
}

export function normalizeRecommendedVideoDuration(value: unknown): number | null {
  const parsed = typeof value === 'string' && value.trim() ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed <= 0) return null
  return Number(parsed.toFixed(2))
}

export function supportsRecommendedVideoDuration(modelKey: string): boolean {
  return isComfyUiLtx23KjPromptRelayWorkflow(modelKey)
    || resolveStoryboardDurationPolicy(modelKey) !== null
}

function resolveModelRecommendedDuration(input: RecommendedVideoDurationInput): number | null {
  const recommended = normalizeRecommendedVideoDuration(input.recommendedDuration)
  if (recommended === null || !supportsRecommendedVideoDuration(input.modelKey)) return null

  const normalized = normalizeStoryboardPanelDuration(
    recommended,
    resolveStoryboardDurationPolicy(input.modelKey),
  )
  return normalized ?? recommended
}

export function withRecommendedVideoDuration(
  definitions: EffectiveVideoCapabilityDefinition[],
  input: RecommendedVideoDurationInput,
): EffectiveVideoCapabilityDefinition[] {
  const recommended = resolveModelRecommendedDuration(input)
  if (recommended === null) return definitions

  return definitions.map((definition) => definition.field === 'duration'
    ? {
        ...definition,
        options: [recommended, ...definition.options.filter((value) => value !== recommended)],
      }
    : definition)
}

export function applyRecommendedVideoDurationSelection(
  selection: Record<string, CapabilityValue>,
  input: RecommendedVideoDurationInput,
): Record<string, CapabilityValue> {
  const recommended = resolveModelRecommendedDuration(input)
  if (recommended === null) return selection
  return { ...selection, duration: recommended }
}
