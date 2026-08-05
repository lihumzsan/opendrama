import { describe, expect, it, vi } from 'vitest'

const aiRuntimeMock = vi.hoisted(() => ({
  executeAiVisionStep: vi.fn(),
}))

vi.mock('@/lib/ai-runtime', () => aiRuntimeMock)

import { planMiniMaxH3Prompt } from '@/lib/novel-promotion/h3-prompt-planner'

const validI2vaPrompt = [
  'integrated_multimodal_description: Picture 1 is the start frame. The subject turns toward the window with a slow handheld push-in.',
  'overall_soundscape: soft room tone, cloth movement, and distant rain; no dialogue, narration, singing, or diegetic music.',
  'non_diegetic_music: a restrained instrumental pulse enters after the turn.',
].join('\n')

const validFl2vaPrompt = [
  'integrated_multimodal_description: Picture 1 is the start frame and Picture 2 is the end frame at 10 seconds. The same subject crosses the room in one continuous dolly shot.',
  'overall_soundscape: quiet footsteps, fabric movement, and steady room tone; no dialogue, narration, singing, or diegetic music.',
  'non_diegetic_music: a restrained instrumental pulse supports the transition.',
].join('\n')

describe('MiniMax H3 prompt planner', () => {
  it('sends FL2VA frames in fixed first-then-last order with explicit picture roles', async () => {
    aiRuntimeMock.executeAiVisionStep.mockResolvedValueOnce({ text: validFl2vaPrompt })

    const result = await planMiniMaxH3Prompt({
      userId: 'user-1',
      projectId: 'project-1',
      analysisModel: 'codex::gpt-5.3-codex',
      mode: 'fl2va',
      creatorPrompt: 'A woman walks to the window.',
      continuityPrompt: 'Keep the room and wardrobe continuous.',
      durationSeconds: 10,
      firstFrameUrl: 'data:image/png;base64,Zmlyc3Q=',
      lastFrameUrl: 'data:image/png;base64,bGFzdA==',
      aspectRatio: '16:9',
    })

    expect(result.prompt).toBe(validFl2vaPrompt)
    expect(aiRuntimeMock.executeAiVisionStep).toHaveBeenCalledWith(expect.objectContaining({
      imageUrls: [
        'data:image/png;base64,Zmlyc3Q=',
        'data:image/png;base64,bGFzdA==',
      ],
      prompt: expect.stringContaining('Picture 1 is the first frame; Picture 2 is the last frame.'),
    }))
  })

  it('sends only Picture 1 to Codex for I2VA', async () => {
    aiRuntimeMock.executeAiVisionStep.mockResolvedValueOnce({ text: validI2vaPrompt })

    await planMiniMaxH3Prompt({
      userId: 'user-1',
      projectId: 'project-1',
      analysisModel: 'codex::gpt-5.3-codex',
      mode: 'i2va',
      creatorPrompt: 'A person looks up.',
      continuityPrompt: 'Hold the same close-up composition.',
      durationSeconds: 5,
      firstFrameUrl: 'data:image/png;base64,Zmlyc3Q=',
      aspectRatio: '9:16',
    })

    expect(aiRuntimeMock.executeAiVisionStep).toHaveBeenCalledWith(expect.objectContaining({
      imageUrls: ['data:image/png;base64,Zmlyc3Q='],
      prompt: expect.stringContaining('Picture 1 is the only input frame.'),
    }))
  })

  it('repairs one invalid planner response and rejects a second invalid response', async () => {
    aiRuntimeMock.executeAiVisionStep.mockClear()
    aiRuntimeMock.executeAiVisionStep
      .mockResolvedValueOnce({ text: 'A person moves.' })
      .mockResolvedValueOnce({ text: validI2vaPrompt })

    await expect(planMiniMaxH3Prompt({
      userId: 'user-1',
      projectId: 'project-1',
      analysisModel: 'codex::gpt-5.3-codex',
      mode: 'i2va',
      creatorPrompt: 'A person moves.',
      continuityPrompt: 'Keep the same person.',
      durationSeconds: 5,
      firstFrameUrl: 'data:image/png;base64,Zmlyc3Q=',
      aspectRatio: '1:1',
    })).resolves.toMatchObject({ prompt: validI2vaPrompt })
    expect(aiRuntimeMock.executeAiVisionStep).toHaveBeenCalledTimes(2)

    aiRuntimeMock.executeAiVisionStep
      .mockResolvedValueOnce({ text: 'still invalid' })
      .mockResolvedValueOnce({ text: '<d>Hello</d>' })

    await expect(planMiniMaxH3Prompt({
      userId: 'user-1',
      projectId: 'project-1',
      analysisModel: 'codex::gpt-5.3-codex',
      mode: 'i2va',
      creatorPrompt: 'A person moves.',
      continuityPrompt: 'Keep the same person.',
      durationSeconds: 5,
      firstFrameUrl: 'data:image/png;base64,Zmlyc3Q=',
      aspectRatio: '1:1',
    })).rejects.toThrow('COMFYUI_MINIMAX_H3_PROMPT_INVALID')
  })
})
