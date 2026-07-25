import { describe, expect, it } from 'vitest'
import { createAudioGenerator, createImageGenerator, createVideoGenerator } from '@/lib/generators/factory'
import { BailianAudioGenerator, BailianImageGenerator, SiliconFlowAudioGenerator } from '@/lib/generators/official'
import { CodexImageGenerator } from '@/lib/generators/image/codex'
import { ComfyUIVideoGenerator } from '@/lib/generators/comfyui-video'

describe('generator factory', () => {
  it('creates video generators only for ComfyUI', () => {
    expect(createVideoGenerator('comfyui')).toBeInstanceOf(ComfyUIVideoGenerator)
  })

  it.each(['gemini-compatible:gm-1', 'bailian'])('rejects disabled video provider %s', (provider) => {
    expect(() => createVideoGenerator(provider)).toThrow(`Unknown video generator provider: ${provider}`)
  })

  it('routes supported Bailian image and audio providers to official generators', () => {
    expect(createImageGenerator('bailian')).toBeInstanceOf(BailianImageGenerator)
    expect(createAudioGenerator('bailian')).toBeInstanceOf(BailianAudioGenerator)
  })

  it('routes siliconflow audio provider to official generator', () => {
    expect(createAudioGenerator('siliconflow')).toBeInstanceOf(SiliconFlowAudioGenerator)
  })

  it('routes codex image provider to codex image generator', () => {
    expect(createImageGenerator('codex', 'gpt-image-2')).toBeInstanceOf(CodexImageGenerator)
  })
})
