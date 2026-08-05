import { describe, expect, it } from 'vitest'
import {
  COMFYUI_MINIMAX_H3_FPS,
  COMFYUI_MINIMAX_H3_FL2VA_WORKFLOW_ID,
  COMFYUI_MINIMAX_H3_I2VA_WORKFLOW_ID,
  normalizeMiniMaxH3Request,
  resolveMiniMaxH3GenerationMode,
} from '@/lib/providers/comfyui/minimax-h3'

describe('MiniMax H3 workflow contract', () => {
  it.each([
    { durationSeconds: 5, frameCount: 124 },
    { durationSeconds: 10, frameCount: 243 },
    { durationSeconds: 15, frameCount: 362 },
  ])('aligns $durationSeconds second requests to the 17k+5 frame grid', ({ durationSeconds, frameCount }) => {
    expect(normalizeMiniMaxH3Request({ durationSeconds })).toMatchObject({
      durationSeconds,
      fps: 24,
      frameCount,
    })
  })

  it('maps normal and first-last-frame requests to distinct H3 workflows', () => {
    expect(resolveMiniMaxH3GenerationMode('normal')).toMatchObject({
      mode: 'i2va',
      workflowKey: COMFYUI_MINIMAX_H3_I2VA_WORKFLOW_ID,
    })
    expect(resolveMiniMaxH3GenerationMode('firstlastframe')).toMatchObject({
      mode: 'fl2va',
      workflowKey: COMFYUI_MINIMAX_H3_FL2VA_WORKFLOW_ID,
    })
  })

  it('keeps requested frame geometry proportional while constraining it to the H3 budget', () => {
    expect(normalizeMiniMaxH3Request({ width: 1920, height: 1080 })).toMatchObject({
      width: 1344,
      height: 768,
    })
    expect(normalizeMiniMaxH3Request({ width: 1024, height: 1024 })).toMatchObject({
      width: 1024,
      height: 992,
    })
  })

  it('rejects unsupported modes and invalid H3 request controls before submission', () => {
    expect(() => resolveMiniMaxH3GenerationMode('reference')).toThrow('COMFYUI_MINIMAX_H3_GENERATION_MODE_INVALID')
    expect(() => normalizeMiniMaxH3Request({ durationSeconds: 4 })).toThrow('COMFYUI_MINIMAX_H3_DURATION_INVALID')
    expect(() => normalizeMiniMaxH3Request({ durationSeconds: 16 })).toThrow('COMFYUI_MINIMAX_H3_DURATION_INVALID')
    expect(() => normalizeMiniMaxH3Request({ fps: 25 })).toThrow('COMFYUI_MINIMAX_H3_FPS_INVALID')
    expect(() => normalizeMiniMaxH3Request({ width: 0, height: 720 })).toThrow('COMFYUI_MINIMAX_H3_DIMENSIONS_INVALID')
    expect(() => normalizeMiniMaxH3Request({ seed: -1 })).toThrow('COMFYUI_MINIMAX_H3_SEED_INVALID')
    expect(() => normalizeMiniMaxH3Request({ seed: Number.MAX_SAFE_INTEGER + 1 })).toThrow('COMFYUI_MINIMAX_H3_SEED_INVALID')
  })

  it('fixes execution at 24 frames per second', () => {
    expect(COMFYUI_MINIMAX_H3_FPS).toBe(24)
  })
})
