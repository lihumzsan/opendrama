import { describe, expect, it } from 'vitest'
import { buildGenerateVideoRequestBody } from '@/lib/novel-promotion/video-generate-request'

describe('video generate request body', () => {
  const SMART_VBVR_MODEL_KEY = 'comfyui::basevideo/ltx23-profiles/t8-smart-vbvr-390k-v2'
  const REMOVED_SMOOTH_FIRST_LAST_MODEL_KEY = 'comfyui::basevideo/ltx23-profiles/t8-smooth-first-last-frame'
  const LEGACY_LTX23_MODEL_KEY = 'comfyui::basevideo/ltx23-profiles/t8-sulphur2-promptrelay-micro'
  const H3_I2VA_MODEL_KEY = 'comfyui::basevideo/minimax-h3/h3-i2va'
  const H3_FL2VA_MODEL_KEY = 'comfyui::basevideo/minimax-h3/h3-fl2va'

  it('includes the visible panel prompt as a root custom prompt when provided', () => {
    expect(buildGenerateVideoRequestBody({
      storyboardId: 'storyboard-1',
      panelIndex: 2,
      videoModel: SMART_VBVR_MODEL_KEY,
      customPrompt: '  visible card video prompt  ',
    })).toEqual({
      storyboardId: 'storyboard-1',
      panelIndex: 2,
      videoModel: SMART_VBVR_MODEL_KEY,
      customPrompt: 'visible card video prompt',
    })
  })

  it('normalizes removed LTX2.3 video model keys to H3 I2VA before submit', () => {
    expect(buildGenerateVideoRequestBody({
      storyboardId: 'storyboard-1',
      panelIndex: 2,
      videoModel: LEGACY_LTX23_MODEL_KEY,
    }).videoModel).toBe(H3_I2VA_MODEL_KEY)
  })

  it('normalizes removed first-last-frame models to H3 FL2VA before submit', () => {
    expect(buildGenerateVideoRequestBody({
      storyboardId: 'storyboard-1',
      panelIndex: 2,
      videoModel: REMOVED_SMOOTH_FIRST_LAST_MODEL_KEY,
      firstLastFrame: {
        flModel: REMOVED_SMOOTH_FIRST_LAST_MODEL_KEY,
        lastFrameStoryboardId: 'storyboard-1',
        lastFramePanelIndex: 3,
      },
    })).toMatchObject({
      videoModel: H3_FL2VA_MODEL_KEY,
      firstLastFrame: {
        flModel: H3_FL2VA_MODEL_KEY,
      },
    })
  })

  it('migrates retired Bernini audio options to H3 I2VA before submit', () => {
    expect(buildGenerateVideoRequestBody({
      storyboardId: 'storyboard-1',
      panelIndex: 2,
      videoModel: 'comfyui::basevideo/seedance2/bernini-480p-i2v-audio-lipsync',
      generationOptions: {
        duration: 5,
        fps: 24,
        resolution: '480p',
        motionStrength: 2,
      },
    })).toMatchObject({
      videoModel: H3_I2VA_MODEL_KEY,
      generationOptions: {
        duration: 5,
        fps: 24,
        resolution: '768P',
        motionStrength: 2,
      },
    })
  })

  it('includes a preceding-output continuity relay when provided', () => {
    expect(buildGenerateVideoRequestBody({
      storyboardId: 'storyboard-1',
      panelIndex: 2,
      videoModel: SMART_VBVR_MODEL_KEY,
      continuityRelay: {
        mode: 'previous_output_end_frame',
        sourceVideoTaskId: 'video-task-1',
        sourceFrameMediaId: 'media-1',
      },
    })).toMatchObject({
      continuityRelay: {
        mode: 'previous_output_end_frame',
        sourceVideoTaskId: 'video-task-1',
        sourceFrameMediaId: 'media-1',
      },
    })
  })
})
