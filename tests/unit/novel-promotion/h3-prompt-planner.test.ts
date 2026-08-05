import { describe, expect, it, vi } from 'vitest'

const aiRuntimeMock = vi.hoisted(() => ({
  executeAiVisionStep: vi.fn(),
}))

vi.mock('@/lib/ai-runtime', () => aiRuntimeMock)

import { planMiniMaxH3Prompt } from '@/lib/novel-promotion/h3-prompt-planner'

const validI2vaPrompt = [
  'For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.',
  '',
  'integrated_multimodal_description: Picture 1 is the start frame. The subject turns toward the window with a slow handheld push-in.',
  'overall_soundscape: soft room tone, cloth movement, and distant rain; no dialogue, narration, singing, or diegetic music.',
  'non_diegetic_music: a restrained instrumental pulse enters after the turn.',
].join('\n')

const validFl2vaPrompt = [
  'How the reference pictures align with the target video — Picture 1 (from [Shot 1]) aligns with the 0.00-second mark of the target video; Picture 2 (from [Shot 1]) aligns with the 10.00-second mark of the target video.',
  '',
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

  it('asks Codex for H3-ready timeline, camera, and audio-sync details without enabling dialogue', async () => {
    aiRuntimeMock.executeAiVisionStep.mockResolvedValueOnce({ text: validFl2vaPrompt })

    await planMiniMaxH3Prompt({
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

    const prompt = aiRuntimeMock.executeAiVisionStep.mock.calls.at(-1)?.[0]?.prompt
    expect(prompt).toContain('How the reference pictures align with the target video')
    expect(prompt).toContain('The first line of the final prompt must be exactly: How the reference pictures align with the target video — Picture 1 (from [Shot 1]) aligns with the 0.00-second mark of the target video; Picture 2 (from [Shot N]) aligns with the 10.00-second mark of the target video.')
    expect(prompt).toContain('Design a clear, continuous motion path from the first-frame state to the last-frame state')
    expect(prompt).toContain('Describe camera movement as natural English action')
    expect(prompt).toContain('Synchronize concrete action sounds with visible events')
    expect(prompt).toContain('Do not create spoken dialogue, voiceover, lyrics, singing, or H3 dialogue tags')
    expect(prompt).not.toContain('T2VA')
    expect(prompt).not.toMatch(/\bL2VA\b/)
  })

  it('repairs an I2VA prompt whose alignment instruction is not its first line', async () => {
    const misalignedI2vaPrompt = [
      'integrated_multimodal_description: Picture 1 is the start frame. The subject turns toward the window.',
      'overall_soundscape: soft room tone and cloth movement.',
      'non_diegetic_music: N/A.',
      '',
      'For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.',
    ].join('\n')
    aiRuntimeMock.executeAiVisionStep.mockClear()
    aiRuntimeMock.executeAiVisionStep
      .mockResolvedValueOnce({ text: misalignedI2vaPrompt })
      .mockResolvedValueOnce({ text: validI2vaPrompt })

    await expect(planMiniMaxH3Prompt({
      userId: 'user-1',
      projectId: 'project-1',
      analysisModel: 'codex::gpt-5.3-codex',
      mode: 'i2va',
      creatorPrompt: 'A person looks up.',
      continuityPrompt: 'Hold the same close-up composition.',
      durationSeconds: 5,
      firstFrameUrl: 'data:image/png;base64,Zmlyc3Q=',
      aspectRatio: '9:16',
    })).resolves.toMatchObject({ prompt: validI2vaPrompt })
    expect(aiRuntimeMock.executeAiVisionStep).toHaveBeenCalledTimes(2)
  })

  it('repairs an I2VA prompt with an extra blank line after its alignment instruction', async () => {
    const extraBlankLineI2vaPrompt = validI2vaPrompt.replace('\n\nintegrated_multimodal_description:', '\n\n\nintegrated_multimodal_description:')
    aiRuntimeMock.executeAiVisionStep.mockClear()
    aiRuntimeMock.executeAiVisionStep
      .mockResolvedValueOnce({ text: extraBlankLineI2vaPrompt })
      .mockResolvedValueOnce({ text: validI2vaPrompt })

    await expect(planMiniMaxH3Prompt({
      userId: 'user-1',
      projectId: 'project-1',
      analysisModel: 'codex::gpt-5.3-codex',
      mode: 'i2va',
      creatorPrompt: 'A person looks up.',
      continuityPrompt: 'Hold the same close-up composition.',
      durationSeconds: 5,
      firstFrameUrl: 'data:image/png;base64,Zmlyc3Q=',
      aspectRatio: '9:16',
    })).resolves.toMatchObject({ prompt: validI2vaPrompt })
    expect(aiRuntimeMock.executeAiVisionStep).toHaveBeenCalledTimes(2)
  })

  it('repairs an FL2VA prompt that leaves the final-shot number as a placeholder', async () => {
    const placeholderFl2vaPrompt = [
      'How the reference pictures align with the target video — Picture 1 (from [Shot 1]) aligns with the 0.00-second mark of the target video; Picture 2 (from [Shot N]) aligns with the 10.00-second mark of the target video.',
      '',
      'integrated_multimodal_description: Picture 1 is the start frame and Picture 2 is the end frame.',
      'overall_soundscape: quiet footsteps and room tone.',
      'non_diegetic_music: N/A.',
    ].join('\n')
    aiRuntimeMock.executeAiVisionStep.mockClear()
    aiRuntimeMock.executeAiVisionStep
      .mockResolvedValueOnce({ text: placeholderFl2vaPrompt })
      .mockResolvedValueOnce({ text: validFl2vaPrompt })

    await expect(planMiniMaxH3Prompt({
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
    })).resolves.toMatchObject({ prompt: validFl2vaPrompt })
    expect(aiRuntimeMock.executeAiVisionStep).toHaveBeenCalledTimes(2)
  })

  it('repairs an FL2VA prompt with an extra blank line after its alignment instruction', async () => {
    const extraBlankLineFl2vaPrompt = validFl2vaPrompt.replace('\n\nintegrated_multimodal_description:', '\n\n\nintegrated_multimodal_description:')
    aiRuntimeMock.executeAiVisionStep.mockClear()
    aiRuntimeMock.executeAiVisionStep
      .mockResolvedValueOnce({ text: extraBlankLineFl2vaPrompt })
      .mockResolvedValueOnce({ text: validFl2vaPrompt })

    await expect(planMiniMaxH3Prompt({
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
    })).resolves.toMatchObject({ prompt: validFl2vaPrompt })
    expect(aiRuntimeMock.executeAiVisionStep).toHaveBeenCalledTimes(2)
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
