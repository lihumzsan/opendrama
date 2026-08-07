import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ComfyUIVideoGenerator } from '@/lib/generators/comfyui-video'
import {
  COMFYUI_MINIMAX_H3_FL2VA_WORKFLOW_ID,
  COMFYUI_MINIMAX_H3_I2VA_WORKFLOW_ID,
} from '@/lib/providers/comfyui/minimax-h3'
import { getProviderConfig } from '@/lib/api-config'
import { isComfyUiWorkflowLlmApiRequired, runComfyUiVideoWorkflow } from '@/lib/providers/comfyui/client'

vi.mock('@/lib/api-config', () => ({
  getProviderConfig: vi.fn(),
}))

vi.mock('@/lib/providers/comfyui/client', () => ({
  isComfyUiWorkflowLlmApiRequired: vi.fn(),
  runComfyUiVideoWorkflow: vi.fn(),
}))

vi.mock('@/lib/providers/comfyui/llm-api-config', () => ({
  resolveComfyUiLlmApiConfig: vi.fn(),
}))

const getProviderConfigMock = vi.mocked(getProviderConfig)
const isComfyUiWorkflowLlmApiRequiredMock = vi.mocked(isComfyUiWorkflowLlmApiRequired)
const runComfyUiVideoWorkflowMock = vi.mocked(runComfyUiVideoWorkflow)

describe('ComfyUI video generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProviderConfigMock.mockResolvedValue({
      id: 'comfyui',
      name: 'ComfyUI',
      apiKey: '',
      baseUrl: 'https://comfy.example',
    })
    isComfyUiWorkflowLlmApiRequiredMock.mockReturnValue(false)
    runComfyUiVideoWorkflowMock.mockResolvedValue({
      videoUrl: 'https://comfy.example/view?filename=generated.mp4&type=output',
      mimeType: 'video/mp4',
      contentLength: 123,
    })
  })

  it('defaults ComfyUI video generation to H3 I2VA', async () => {
    const generator = new ComfyUIVideoGenerator()

    const result = await generator.generate({
      userId: 'user-1',
      imageUrl: 'https://example.com/first.png',
      prompt: 'integrated_multimodal_description: Picture 1 begins the motion.',
      options: { duration: 5, fps: 24 },
    })

    expect(result.success).toBe(true)
    expect(runComfyUiVideoWorkflowMock).toHaveBeenCalledWith(expect.objectContaining({
      workflowKey: COMFYUI_MINIMAX_H3_I2VA_WORKFLOW_ID,
      durationSeconds: 5,
      fps: 24,
    }))
  })

  it('forwards explicit H3 FL2VA first-last-frame inputs', async () => {
    const generator = new ComfyUIVideoGenerator()

    const result = await generator.generate({
      userId: 'user-1',
      imageUrl: 'https://example.com/first.png',
      prompt: 'integrated_multimodal_description: Picture 1 transitions to Picture 2.',
      options: {
        modelId: COMFYUI_MINIMAX_H3_FL2VA_WORKFLOW_ID,
        duration: 10,
        fps: 24,
        lastFrameImageUrl: 'https://example.com/last.png',
      },
    })

    expect(result.success).toBe(true)
    expect(runComfyUiVideoWorkflowMock).toHaveBeenCalledWith(expect.objectContaining({
      workflowKey: COMFYUI_MINIMAX_H3_FL2VA_WORKFLOW_ID,
      lastFrameImageUrl: 'https://example.com/last.png',
    }))
  })
})
