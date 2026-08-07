import {
  COMFYUI_MINIMAX_H3_FL2VA_MODEL_KEY,
  COMFYUI_MINIMAX_H3_I2VA_MODEL_KEY,
} from '@/lib/providers/comfyui/minimax-h3'

export const DEFAULT_VIDEO_MODEL_KEY = COMFYUI_MINIMAX_H3_I2VA_MODEL_KEY
export const DEFAULT_FIRST_LAST_FRAME_VIDEO_MODEL_KEY = COMFYUI_MINIMAX_H3_FL2VA_MODEL_KEY

function readTrimmedModelKey(raw: string | null | undefined): string {
  return typeof raw === 'string' ? raw.trim().replace(/\\/g, '/') : ''
}

export function normalizeVideoModelKey(raw: string | null | undefined): string {
  return readTrimmedModelKey(raw)
}

export function normalizeDefaultVideoModel(raw: string | null | undefined): string {
  return normalizeVideoModelKey(raw) || DEFAULT_VIDEO_MODEL_KEY
}

export function resolveDefaultFirstLastFrameVideoModel(
  modelKeys: readonly string[],
): string {
  return modelKeys.includes(DEFAULT_FIRST_LAST_FRAME_VIDEO_MODEL_KEY)
    ? DEFAULT_FIRST_LAST_FRAME_VIDEO_MODEL_KEY
    : modelKeys[0] || ''
}
