export const COMFYUI_MINIMAX_H3_I2VA_WORKFLOW_ID = 'basevideo/minimax-h3/h3-i2va'
export const COMFYUI_MINIMAX_H3_FL2VA_WORKFLOW_ID = 'basevideo/minimax-h3/h3-fl2va'
export const COMFYUI_MINIMAX_H3_I2VA_MODEL_KEY = `comfyui::${COMFYUI_MINIMAX_H3_I2VA_WORKFLOW_ID}`
export const COMFYUI_MINIMAX_H3_FL2VA_MODEL_KEY = `comfyui::${COMFYUI_MINIMAX_H3_FL2VA_WORKFLOW_ID}`
export const COMFYUI_MINIMAX_H3_FPS = 24
export const COMFYUI_MINIMAX_H3_MIN_DURATION_SECONDS = 5
export const COMFYUI_MINIMAX_H3_MAX_DURATION_SECONDS = 15
export const COMFYUI_MINIMAX_H3_DEFAULT_DURATION_SECONDS = 10
export const COMFYUI_MINIMAX_H3_FRAME_ALIGNMENT = 17
export const COMFYUI_MINIMAX_H3_FRAME_REMAINDER = 5
export const COMFYUI_MINIMAX_H3_DIMENSION_ALIGNMENT = 32
export const COMFYUI_MINIMAX_H3_MAX_PIXELS = 768 * 1344

export type MiniMaxH3Mode = 'i2va' | 'fl2va'

export type MiniMaxH3GenerationMode = {
  mode: MiniMaxH3Mode
  workflowKey: string
}

export type MiniMaxH3Request = {
  durationSeconds?: unknown
  fps?: unknown
  width?: unknown
  height?: unknown
  seed?: unknown
}

export type NormalizedMiniMaxH3Request = {
  durationSeconds: number
  fps: typeof COMFYUI_MINIMAX_H3_FPS
  frameCount: number
  width?: number
  height?: number
  seed?: number
}

function normalizeWorkflowKey(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().replace(/^comfyui::/, '') : ''
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function alignDimension(value: number): number {
  return Math.max(
    COMFYUI_MINIMAX_H3_DIMENSION_ALIGNMENT,
    Math.round(value / COMFYUI_MINIMAX_H3_DIMENSION_ALIGNMENT) * COMFYUI_MINIMAX_H3_DIMENSION_ALIGNMENT,
  )
}

function normalizeDimensions(width: unknown, height: unknown): Pick<NormalizedMiniMaxH3Request, 'width' | 'height'> {
  if (width === undefined && height === undefined) return {}
  if (!isFiniteNumber(width) || !isFiniteNumber(height) || width <= 0 || height <= 0) {
    throw new Error('COMFYUI_MINIMAX_H3_DIMENSIONS_INVALID: width and height must be positive finite numbers')
  }

  const sourceWidth = Math.round(width)
  const sourceHeight = Math.round(height)
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('COMFYUI_MINIMAX_H3_DIMENSIONS_INVALID: width and height must round to positive integers')
  }

  const scale = Math.min(1, Math.sqrt(COMFYUI_MINIMAX_H3_MAX_PIXELS / (sourceWidth * sourceHeight)))
  let normalizedWidth = alignDimension(sourceWidth * scale)
  let normalizedHeight = alignDimension(sourceHeight * scale)

  while (normalizedWidth * normalizedHeight > COMFYUI_MINIMAX_H3_MAX_PIXELS) {
    if (normalizedWidth > normalizedHeight) {
      normalizedWidth -= COMFYUI_MINIMAX_H3_DIMENSION_ALIGNMENT
    } else {
      normalizedHeight -= COMFYUI_MINIMAX_H3_DIMENSION_ALIGNMENT
    }
  }

  return { width: normalizedWidth, height: normalizedHeight }
}

export function resolveMiniMaxH3GenerationMode(value: unknown): MiniMaxH3GenerationMode {
  if (value === 'normal') {
    return { mode: 'i2va', workflowKey: COMFYUI_MINIMAX_H3_I2VA_WORKFLOW_ID }
  }
  if (value === 'firstlastframe') {
    return { mode: 'fl2va', workflowKey: COMFYUI_MINIMAX_H3_FL2VA_WORKFLOW_ID }
  }
  throw new Error('COMFYUI_MINIMAX_H3_GENERATION_MODE_INVALID: expected normal or firstlastframe')
}

export function getMiniMaxH3ModeForWorkflow(value: string | null | undefined): MiniMaxH3Mode | null {
  const workflowKey = normalizeWorkflowKey(value)
  if (workflowKey === COMFYUI_MINIMAX_H3_I2VA_WORKFLOW_ID) return 'i2va'
  if (workflowKey === COMFYUI_MINIMAX_H3_FL2VA_WORKFLOW_ID) return 'fl2va'
  return null
}

export function isComfyUiMiniMaxH3Workflow(value: string | null | undefined): boolean {
  return getMiniMaxH3ModeForWorkflow(value) !== null
}

export function resolveMiniMaxH3FrameCount(durationSeconds: number): number {
  const roundedFrameCount = Math.round(durationSeconds * COMFYUI_MINIMAX_H3_FPS)
  return roundedFrameCount
    + ((COMFYUI_MINIMAX_H3_FRAME_REMAINDER - (roundedFrameCount % COMFYUI_MINIMAX_H3_FRAME_ALIGNMENT)
      + COMFYUI_MINIMAX_H3_FRAME_ALIGNMENT) % COMFYUI_MINIMAX_H3_FRAME_ALIGNMENT)
}

export function normalizeMiniMaxH3Request(request: MiniMaxH3Request): NormalizedMiniMaxH3Request {
  const durationSeconds = request.durationSeconds === undefined
    ? COMFYUI_MINIMAX_H3_DEFAULT_DURATION_SECONDS
    : request.durationSeconds
  if (
    !isFiniteNumber(durationSeconds)
    || durationSeconds < COMFYUI_MINIMAX_H3_MIN_DURATION_SECONDS
    || durationSeconds > COMFYUI_MINIMAX_H3_MAX_DURATION_SECONDS
  ) {
    throw new Error('COMFYUI_MINIMAX_H3_DURATION_INVALID: expected a finite number from 5 to 15 seconds')
  }
  if (request.fps !== undefined && request.fps !== COMFYUI_MINIMAX_H3_FPS) {
    throw new Error('COMFYUI_MINIMAX_H3_FPS_INVALID: MiniMax H3 requires 24 FPS')
  }
  if (
    request.seed !== undefined
    && (!isFiniteNumber(request.seed) || !Number.isSafeInteger(request.seed) || request.seed < 0)
  ) {
    throw new Error('COMFYUI_MINIMAX_H3_SEED_INVALID: seed must be a non-negative safe integer')
  }

  return {
    durationSeconds,
    fps: COMFYUI_MINIMAX_H3_FPS,
    frameCount: resolveMiniMaxH3FrameCount(durationSeconds),
    ...normalizeDimensions(request.width, request.height),
    ...(request.seed === undefined ? {} : { seed: request.seed }),
  }
}
