import {
  COMFYUI_LTX23_GOON_FIRST_LAST_FRAME_MODEL_KEY,
  COMFYUI_LTX23_GOON_FIRST_LAST_FRAME_WORKFLOW_ID,
  COMFYUI_LTX23_WORKFLOW_KEYS,
} from '@/lib/providers/comfyui/ltx23-workflow-profiles'

export const DEFAULT_VIDEO_MODEL_KEY = 'comfyui::basevideo/ltx23-profiles/t8-multishot-precise-promptrelay-kj-720p'

export const CURRENT_LTX23_VIDEO_MODEL_KEYS = [
  `comfyui::${COMFYUI_LTX23_WORKFLOW_KEYS.singleImagePrecise}`,
  COMFYUI_LTX23_GOON_FIRST_LAST_FRAME_MODEL_KEY,
] as const

export const LEGACY_LTX23_VIDEO_MODEL_KEYS = [
  'comfyui::basevideo/ltx23-profiles/t8-sulphur2-promptrelay-micro',
  'comfyui::basevideo/ltx23-profiles/t8-single-image-large-motion-4stage',
  'comfyui::basevideo/ltx23-profiles/damaicha-image-to-30s-long-video',
  'comfyui::basevideo/ltx23-profiles/damaicha-long-video-promptrelay',
  'comfyui::basevideo/ltx23-profiles/damaicha-aio-v2-no-subtitles',
] as const

const LEGACY_LTX23_WORKFLOW_IDS = new Set(
  LEGACY_LTX23_VIDEO_MODEL_KEYS.map((key) => key.replace(/^comfyui::/, '')),
)

const LEGACY_LTX23_SMOOTH_FIRST_LAST_FRAME_WORKFLOW_ID =
  'basevideo/ltx23-profiles/t8-smooth-first-last-frame'

const RETIRED_BERNINI_WORKFLOW_IDS = new Set([
  'basevideo/seedance2/bernini-480p-i2v',
  'basevideo/seedance2/bernini-480p-i2v-audio-lipsync',
])

function readTrimmedModelKey(raw: string | null | undefined): string {
  return typeof raw === 'string' ? raw.trim().replace(/\\/g, '/') : ''
}

function toWorkflowId(modelKey: string): string {
  return modelKey.startsWith('comfyui::') ? modelKey.slice('comfyui::'.length) : modelKey
}

export function isLegacyLtx23VideoModelKey(raw: string | null | undefined): boolean {
  const modelKey = readTrimmedModelKey(raw)
  if (!modelKey) return false
  return LEGACY_LTX23_WORKFLOW_IDS.has(toWorkflowId(modelKey))
}

export function isLegacyLtx23SmoothFirstLastFrameModelKey(
  raw: string | null | undefined,
): boolean {
  const modelKey = readTrimmedModelKey(raw)
  return !!modelKey && toWorkflowId(modelKey) === LEGACY_LTX23_SMOOTH_FIRST_LAST_FRAME_WORKFLOW_ID
}

export function isRetiredBerniniVideoModelKey(raw: string | null | undefined): boolean {
  const modelKey = readTrimmedModelKey(raw)
  if (!modelKey) return false
  return RETIRED_BERNINI_WORKFLOW_IDS.has(toWorkflowId(modelKey))
}

export function normalizeRetiredBerniniVideoGenerationOptions<T extends Record<string, unknown>>(
  rawModelKey: string | null | undefined,
  generationOptions: T,
): T {
  if (!isRetiredBerniniVideoModelKey(rawModelKey)) return generationOptions
  return {
    ...generationOptions,
    fps: 25,
    resolution: '720p',
  } as T
}

export function normalizeVideoModelKey(raw: string | null | undefined): string {
  const modelKey = readTrimmedModelKey(raw)
  if (!modelKey) return ''
  if (isLegacyLtx23SmoothFirstLastFrameModelKey(modelKey)) {
    return modelKey.startsWith('comfyui::')
      ? COMFYUI_LTX23_GOON_FIRST_LAST_FRAME_MODEL_KEY
      : COMFYUI_LTX23_GOON_FIRST_LAST_FRAME_WORKFLOW_ID
  }
  return isLegacyLtx23VideoModelKey(modelKey) || isRetiredBerniniVideoModelKey(modelKey)
    ? DEFAULT_VIDEO_MODEL_KEY
    : modelKey
}

export function normalizeDefaultVideoModel(raw: string | null | undefined): string {
  return normalizeVideoModelKey(raw) || DEFAULT_VIDEO_MODEL_KEY
}
