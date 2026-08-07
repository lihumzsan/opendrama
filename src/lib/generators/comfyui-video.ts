import { getProviderConfig } from '@/lib/api-config'
import { normalizeVideoModelKey } from '@/lib/novel-promotion/video-model-defaults'
import { isComfyUiWorkflowLlmApiRequired, runComfyUiVideoWorkflow } from '@/lib/providers/comfyui/client'
import { COMFYUI_MINIMAX_H3_I2VA_WORKFLOW_ID } from '@/lib/providers/comfyui/minimax-h3'
import { resolveComfyUiLlmApiConfig } from '@/lib/providers/comfyui/llm-api-config'
import { BaseVideoGenerator, type GenerateResult, type VideoGenerateParams } from './base'

const ASPECT_TO_SIZE: Record<string, { w: number; h: number }> = {
  '1:1': { w: 1024, h: 1024 },
  '16:9': { w: 1280, h: 736 },
  '9:16': { w: 736, h: 1280 },
  '3:4': { w: 960, h: 1280 },
  '4:3': { w: 1280, h: 960 },
  '3:2': { w: 1216, h: 832 },
  '2:3': { w: 832, h: 1216 },
}

const COMFYUI_VIDEO_DIMENSION_ALIGNMENT = 32
const COMFYUI_MINIMAX_H3_WORKFLOW_PREFIX = 'basevideo/minimax-h3/'
const COMFYUI_H3_768P_SIZE = { w: 1344, h: 768 } as const

function alignComfyUiVideoDimension(value: number, alignment = COMFYUI_VIDEO_DIMENSION_ALIGNMENT): number {
  return Math.max(
    64,
    Math.min(4096, Math.round(value / alignment) * alignment),
  )
}

function normalizeComfyUiVideoSize(size: { w: number; h: number } | null): { w: number; h: number } | null {
  if (!size) return null
  return {
    w: alignComfyUiVideoDimension(size.w),
    h: alignComfyUiVideoDimension(size.h),
  }
}

function normalizeComfyUiReferenceImageUrls(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const urls = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
  return urls.length > 0 ? urls : undefined
}

function normalizeComfyUiReferenceAudioUrls(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const urls = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
  return urls.length > 0 ? urls : undefined
}

function normalizeComfyUiProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (
    message.startsWith('COMFYUI_LLM_MODEL_NOT_CONFIGURED')
    || message.startsWith('COMFYUI_LLM_MODEL_NOT_OPENROUTER')
    || message.startsWith('COMFYUI_WORKFLOW_NOT_FOUND')
  ) {
    return `MODEL_NOT_CONFIGURED: ${message}`
  }
  return message
}

function normalizeComfyUiVideoWorkflowKey(rawWorkflowKey: string): string {
  const normalizedModelKey = normalizeVideoModelKey(rawWorkflowKey)
  return normalizedModelKey.startsWith('comfyui::')
    ? normalizedModelKey.slice('comfyui::'.length)
    : normalizedModelKey
}

function isComfyUiMiniMaxH3Workflow(workflowKey: string): boolean {
  const normalizedWorkflowKey = workflowKey.trim().replace(/\\/g, '/')
  return normalizedWorkflowKey.startsWith(COMFYUI_MINIMAX_H3_WORKFLOW_PREFIX)
}

function parseWxH(size: string | undefined): { w: number; h: number } | null {
  if (!size || typeof size !== 'string') return null
  const match = /^(\d+)\s*x\s*(\d+)$/i.exec(size.trim())
  if (!match) return null

  const w = Number(match[1])
  const h = Number(match[2])
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 64 || h < 64 || w > 4096 || h > 4096) {
    return null
  }
  return { w, h }
}

export class ComfyUIVideoGenerator extends BaseVideoGenerator {
  protected async doGenerate(params: VideoGenerateParams): Promise<GenerateResult> {
    const { userId, imageUrl, prompt, options = {} } = params
    const normalizedOptions = options
    const rawWorkflowKey = typeof normalizedOptions.modelId === 'string' && normalizedOptions.modelId.trim()
      ? normalizedOptions.modelId.trim()
      : null
    const workflowKey = rawWorkflowKey
      ? normalizeComfyUiVideoWorkflowKey(rawWorkflowKey)
      : COMFYUI_MINIMAX_H3_I2VA_WORKFLOW_ID

    const providerId = typeof normalizedOptions.provider === 'string' ? normalizedOptions.provider : 'comfyui'
    const { baseUrl } = await getProviderConfig(userId, providerId)

    if (!baseUrl) {
      return {
        success: false,
        error: 'COMFYUI_BASE_URL_MISSING: configure your ComfyUI Base URL first',
      }
    }

    const referenceAudioUrls = normalizeComfyUiReferenceAudioUrls(normalizedOptions.referenceAudioUrls)
    const selectedWorkflowKey = workflowKey
    const directSize = parseWxH(typeof normalizedOptions.size === 'string' ? normalizedOptions.size : undefined)
    const requestedAspectRatio = typeof normalizedOptions.aspectRatio === 'string'
      ? normalizedOptions.aspectRatio.trim()
      : undefined
    const aspectSize = requestedAspectRatio
      ? ASPECT_TO_SIZE[requestedAspectRatio]
      : undefined
    const targetSize = isComfyUiMiniMaxH3Workflow(selectedWorkflowKey)
      ? COMFYUI_H3_768P_SIZE
      : normalizeComfyUiVideoSize(directSize || aspectSize || null)

    try {
      const llmApi = isComfyUiWorkflowLlmApiRequired(selectedWorkflowKey)
        ? await resolveComfyUiLlmApiConfig({
            userId,
            analysisModel: typeof normalizedOptions.analysisModel === 'string' ? normalizedOptions.analysisModel : null,
          })
        : undefined
      const { videoUrl, mimeType, contentLength } = await runComfyUiVideoWorkflow({
        baseUrl,
        workflowKey: selectedWorkflowKey,
        prompt: prompt || '',
        firstFrameImageUrl: imageUrl,
        referenceImageUrls: normalizeComfyUiReferenceImageUrls(normalizedOptions.referenceImageUrls),
        referenceAudioUrls,
        lastFrameImageUrl: typeof normalizedOptions.lastFrameImageUrl === 'string' ? normalizedOptions.lastFrameImageUrl : undefined,
        width: targetSize?.w,
        height: targetSize?.h,
        durationSeconds: typeof normalizedOptions.duration === 'number' ? normalizedOptions.duration : undefined,
        fps: typeof normalizedOptions.fps === 'number' ? normalizedOptions.fps : undefined,
        seed: typeof normalizedOptions.seed === 'number' ? normalizedOptions.seed : undefined,
        motionStrength: typeof normalizedOptions.motionStrength === 'number' ? normalizedOptions.motionStrength : undefined,
        llmApi,
      })

      return {
        success: true,
        videoUrl,
        videoStream: {
          mimeType,
          ...(contentLength === undefined ? {} : { contentLength }),
        },
      }
    } catch (error) {
      return {
        success: false,
        error: normalizeComfyUiProviderError(error).slice(0, 500),
      }
    }
  }
}
