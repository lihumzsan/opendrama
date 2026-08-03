import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  COMFYUI_LTX23_WORKFLOW_KEYS,
  getLtx23WorkflowProfiles,
} from '@/lib/providers/comfyui/ltx23-workflow-profiles'
import {
  comfyUiWorkflowRequiresLlmApi,
  getComfyUiWorkflowParameterContract,
  getComfyUiWorkflowImageInputCount,
  getComfyUiWorkflowVideoInputCount,
  listComfyUiWorkflowKeys,
  resolveComfyUiWorkflow,
  validateResolvedWorkflowPreflight,
} from '@/lib/providers/comfyui/workflow-registry'
import { VIDEO_SEAM_CONCAT_MAX_TRIM_FRAMES } from '@/lib/video-tools/trim-frames'

function getLoadImageNodes(workflow: ReturnType<typeof resolveComfyUiWorkflow>) {
  return Object.values(workflow).filter((node) => node.class_type.toLowerCase().includes('loadimage'))
}

function getLoadAudioNodes(workflow: ReturnType<typeof resolveComfyUiWorkflow>) {
  return Object.values(workflow).filter((node) => node.class_type.toLowerCase().includes('loadaudio'))
}

function getPromptRelayNodes(workflow: ReturnType<typeof resolveComfyUiWorkflow>) {
  return Object.values(workflow).filter((node) => node.class_type.toLowerCase().includes('promptrelay'))
}

describe('comfyui workflow registry', () => {
  let workflowRoot: string | null = null
  const VIDEO_SEAM_CONCAT_WORKFLOW_KEY = 'basevideo/tools/video-seam-concat-nvenc'

  it('injects both video files and exact frame trims into the fixed seam-concat workflow', () => {
    expect(getComfyUiWorkflowVideoInputCount(VIDEO_SEAM_CONCAT_WORKFLOW_KEY)).toBe(2)

    const workflow = resolveComfyUiWorkflow(VIDEO_SEAM_CONCAT_WORKFLOW_KEY, {
      videoFilenames: ['first.mp4', 'second.mp4'],
      videoTrimFrames: [3, 4],
    })

    expect(workflow['1']).toMatchObject({
      class_type: 'LoadVideo',
      inputs: { file: 'first.mp4' },
    })
    expect(workflow['2']).toMatchObject({
      class_type: 'LoadVideo',
      inputs: { file: 'second.mp4' },
    })
    expect(workflow['1']?.inputs).not.toHaveProperty('upload')
    expect(workflow['2']?.inputs).not.toHaveProperty('upload')
    expect(workflow['3']).toMatchObject({
      class_type: 'GetVideoComponents',
      inputs: { video: ['1', 0] },
    })
    expect(workflow['4']).toMatchObject({
      class_type: 'GetVideoComponents',
      inputs: { video: ['2', 0] },
    })
    expect(workflow['5']).toMatchObject({
      class_type: 'GetImageSize',
      inputs: { image: ['3', 0] },
    })
    expect(workflow['6']).toMatchObject({
      class_type: 'GetImageSize',
      inputs: { image: ['4', 0] },
    })
    expect(workflow['7']).toMatchObject({
      class_type: 'ComfyMathExpression',
      inputs: {
        expression: '(a - b) / (a > b)',
        'values.a': ['5', 2],
        'values.b': 3,
      },
    })
    expect(workflow['8']).toMatchObject({
      class_type: 'ComfyMathExpression',
      inputs: {
        expression: '(a - b) / (a > b)',
        'values.a': ['6', 2],
        'values.b': 4,
      },
    })
    expect(workflow['9']).toMatchObject({
      class_type: 'ImageFromBatch',
      inputs: {
        image: ['3', 0],
        batch_index: 0,
        length: ['7', 1],
      },
    })
    expect(workflow['10']).toMatchObject({
      class_type: 'ImageFromBatch',
      inputs: {
        image: ['4', 0],
        batch_index: 4,
        length: ['8', 1],
      },
    })
    expect(workflow['11']).toMatchObject({
      class_type: 'ComfyMathExpression',
      inputs: {
        expression: 'a / b',
        'values.a': ['7', 0],
        'values.b': ['3', 2],
      },
    })
    expect(workflow['12']).toMatchObject({
      class_type: 'ComfyMathExpression',
      inputs: {
        expression: 'a / b',
        'values.a': ['8', 0],
        'values.b': ['4', 2],
      },
    })
    expect(workflow['13']).toMatchObject({
      class_type: 'ComfyMathExpression',
      inputs: {
        expression: 'a / b',
        'values.a': 4,
        'values.b': ['4', 2],
      },
    })
    expect(workflow['14']).toMatchObject({
      class_type: 'TrimAudioDuration',
      inputs: {
        audio: ['3', 1],
        start_index: 0,
        duration: ['11', 0],
      },
    })
    expect(workflow['15']).toMatchObject({
      class_type: 'TrimAudioDuration',
      inputs: {
        audio: ['4', 1],
        start_index: ['13', 0],
        duration: ['12', 0],
      },
    })
    expect(workflow['16']?.inputs).toMatchObject({
      images_A: ['9', 0],
      images_B: ['10', 0],
    })
    expect(workflow['17']?.inputs).toMatchObject({
      audio1: ['14', 0],
      audio2: ['15', 0],
    })
    expect(workflow['18']).toMatchObject({
      class_type: 'VHS_VideoCombine',
      inputs: {
        frame_rate: ['3', 2],
        images: ['16', 0],
        audio: ['17', 0],
        format: 'video/nvenc_h264-mp4',
        pix_fmt: 'yuv420p',
        bitrate: 10,
        megabit: true,
      },
    })
  })

  it('does not expose the removed endpoint or silent bridge-compose workflows', () => {
    expect(listComfyUiWorkflowKeys()).not.toContain('basevideo/tools/video-seam-endpoint')
    expect(listComfyUiWorkflowKeys()).not.toContain('basevideo/tools/video-seam-bridge-compose-nvenc')
  })

  it.each([
    { label: 'Video 1 exact-full-length trim', nodeId: '7', frameCountNodeId: '5', totalFrames: 24, trimFrames: 24 },
    { label: 'Video 1 over-length trim', nodeId: '7', frameCountNodeId: '5', totalFrames: 24, trimFrames: 25 },
    { label: 'Video 2 exact-full-length trim', nodeId: '8', frameCountNodeId: '6', totalFrames: 48, trimFrames: 48 },
    { label: 'Video 2 over-length trim', nodeId: '8', frameCountNodeId: '6', totalFrames: 48, trimFrames: 49 },
  ])('uses a video-frame-only assertion for $label, including silent inputs', ({
    nodeId,
    frameCountNodeId,
    totalFrames,
    trimFrames,
  }) => {
    const trims: [number, number] = nodeId === '7' ? [trimFrames, 0] : [0, trimFrames]
    const workflow = resolveComfyUiWorkflow(VIDEO_SEAM_CONCAT_WORKFLOW_KEY, {
      videoTrimFrames: trims,
    })
    const retainedFrameNode = workflow[nodeId]

    expect(retainedFrameNode).toMatchObject({
      class_type: 'ComfyMathExpression',
      inputs: {
        expression: '(a - b) / (a > b)',
        'values.a': [frameCountNodeId, 2],
        'values.b': trimFrames,
      },
    })

    // ComfyMathExpression treats booleans numerically. False becomes zero, so
    // exact-full and over-length trims both fail with division by zero. The
    // assertion reads only GetImageSize's batch count and therefore also
    // applies when the source video has no audio stream.
    const retainedFrames = (totalFrames - trimFrames) / Number(totalFrames > trimFrames)
    expect(Number.isFinite(retainedFrames)).toBe(false)
    expect(retainedFrameNode?.inputs['values.a']).not.toEqual(['3', 1])
    expect(retainedFrameNode?.inputs['values.a']).not.toEqual(['4', 1])
  })

  it('accepts seam trim frame boundaries in direct workflow resolution', () => {
    const workflow = resolveComfyUiWorkflow(VIDEO_SEAM_CONCAT_WORKFLOW_KEY, {
      videoTrimFrames: [0, VIDEO_SEAM_CONCAT_MAX_TRIM_FRAMES],
    })

    expect(workflow['7']?.inputs['values.b']).toBe(0)
    expect(workflow['8']?.inputs['values.b']).toBe(VIDEO_SEAM_CONCAT_MAX_TRIM_FRAMES)
    expect(workflow['10']?.inputs.batch_index).toBe(VIDEO_SEAM_CONCAT_MAX_TRIM_FRAMES)
    expect(workflow['13']?.inputs['values.a']).toBe(VIDEO_SEAM_CONCAT_MAX_TRIM_FRAMES)
  })

  it.each([
    {
      name: 'negative end trim',
      videoTrimFrames: [-1, 0] as [number, number],
      error: 'COMFYUI_VIDEO_SEAM_TRIM_END_FRAMES_INVALID: expected an integer between 0 and 100000',
    },
    {
      name: 'fractional start trim',
      videoTrimFrames: [0, 1.5] as [number, number],
      error: 'COMFYUI_VIDEO_SEAM_TRIM_START_FRAMES_INVALID: expected an integer between 0 and 100000',
    },
    {
      name: 'over-limit end trim',
      videoTrimFrames: [VIDEO_SEAM_CONCAT_MAX_TRIM_FRAMES + 1, 0] as [number, number],
      error: 'COMFYUI_VIDEO_SEAM_TRIM_END_FRAMES_INVALID: expected an integer between 0 and 100000',
    },
    {
      name: 'non-finite start trim',
      videoTrimFrames: [0, Number.POSITIVE_INFINITY] as [number, number],
      error: 'COMFYUI_VIDEO_SEAM_TRIM_START_FRAMES_INVALID: expected an integer between 0 and 100000',
    },
  ])('rejects $name in direct seam workflow resolution', ({ videoTrimFrames, error }) => {
    expect(() => resolveComfyUiWorkflow(VIDEO_SEAM_CONCAT_WORKFLOW_KEY, {
      videoTrimFrames,
    })).toThrow(error)
  })

  afterEach(() => {
    delete process.env.COMFYUI_WORKFLOW_ROOT
    if (workflowRoot) {
      rmSync(workflowRoot, { recursive: true, force: true })
      workflowRoot = null
    }
  })

  function writeExternalWorkflow(workflowKey: string, workflow: unknown) {
    workflowRoot = workflowRoot || mkdtempSync(join(tmpdir(), 'opendrama-comfyui-workflow-'))
    process.env.COMFYUI_WORKFLOW_ROOT = workflowRoot
    const filePath = join(workflowRoot, `${workflowKey}.json`)
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, JSON.stringify(workflow), 'utf-8')
  }

  it.each([
    {
      label: 'missing retained-frame node',
      mutate: (workflow: ReturnType<typeof resolveComfyUiWorkflow>) => {
        delete workflow['7']
      },
      expected: 'node 7 must be ComfyMathExpression with input values.b',
    },
    {
      label: 'wrong head-trim node class',
      mutate: (workflow: ReturnType<typeof resolveComfyUiWorkflow>) => {
        workflow['10'].class_type = 'PreviewImage'
      },
      expected: 'node 10 must be ImageFromBatch with input batch_index',
    },
    {
      label: 'missing audio-start trim input',
      mutate: (workflow: ReturnType<typeof resolveComfyUiWorkflow>) => {
        delete workflow['13'].inputs['values.a']
      },
      expected: 'node 13 must be ComfyMathExpression with input values.a',
    },
  ])('rejects a malformed fixed seam workflow contract: $label', ({ mutate, expected }) => {
    const workflow = resolveComfyUiWorkflow(VIDEO_SEAM_CONCAT_WORKFLOW_KEY, {
      videoFilenames: ['first.mp4', 'second.mp4'],
    })
    mutate(workflow)
    writeExternalWorkflow(VIDEO_SEAM_CONCAT_WORKFLOW_KEY, workflow)

    expect(() => resolveComfyUiWorkflow(VIDEO_SEAM_CONCAT_WORKFLOW_KEY, {
      videoTrimFrames: [3, 4],
    })).toThrow(`COMFYUI_VIDEO_SEAM_WORKFLOW_CONTRACT_INVALID: ${expected}`)
  })

  it('detects and injects OpenRouter config into RH LLM API nodes', () => {
    writeExternalWorkflow('basevideo/test/rh-llm', {
      '1': {
        class_type: 'RH_LLMAPI_NODE',
        inputs: {
          api_baseurl: '__COMFYUI_LLM_BASE_URL__',
          api_key: '__COMFYUI_LLM_API_KEY__',
          model: '__COMFYUI_LLM_MODEL__',
          prompt: 'rewrite prompt',
        },
      },
    })

    expect(comfyUiWorkflowRequiresLlmApi('basevideo/test/rh-llm')).toBe(true)

    const workflow = resolveComfyUiWorkflow('basevideo/test/rh-llm', {
      llmApi: {
        baseUrl: 'https://openrouter.ai/api/v1/',
        apiKey: 'or-test-key',
        model: 'openrouter/test-model',
      },
    })

    expect(workflow['1']?.inputs.api_baseurl).toBe('https://openrouter.ai/api/v1')
    expect(workflow['1']?.inputs.api_key).toBe('or-test-key')
    expect(workflow['1']?.inputs.model).toBe('openrouter/test-model')
  })

  it('fails fast when an RH LLM API workflow is resolved without an OpenRouter config', () => {
    writeExternalWorkflow('basevideo/test/rh-llm-missing-config', {
      '1': {
        class_type: 'RH_LLMAPI_NODE',
        inputs: {
          api_baseurl: '__COMFYUI_LLM_BASE_URL__',
          api_key: '__COMFYUI_LLM_API_KEY__',
          model: '__COMFYUI_LLM_MODEL__',
        },
      },
    })

    expect(() => resolveComfyUiWorkflow('basevideo/test/rh-llm-missing-config')).toThrow(
      'COMFYUI_LLM_MODEL_NOT_CONFIGURED',
    )
  })

  it('applies target aspect ratio and longest side to Qwen storyboard resize nodes', () => {
    const workflowKey = listComfyUiWorkflowKeys().find((key) =>
      key.includes('baseimage/')
      && key.includes('Qwen')
    )

    expect(workflowKey).toBeTruthy()

    const workflow = resolveComfyUiWorkflow(workflowKey!, {
      prompt: 'dimension test',
      width: 1280,
      height: 720,
      imageFilenames: ['reference.jpg'],
      llmApi: {
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: 'or-test-key',
        model: 'openrouter/test-model',
      },
    })

    const resizeNode = Object.values(workflow).find((node) =>
      Object.prototype.hasOwnProperty.call(node.inputs, 'aspect_ratio')
      && Object.prototype.hasOwnProperty.call(node.inputs, 'scale_to_length')
    )
    expect(resizeNode?.inputs.aspect_ratio).toBe('16:9')

    const scaleToLength = resizeNode?.inputs.scale_to_length
    expect(Array.isArray(scaleToLength)).toBe(true)
    const intNodeId = Array.isArray(scaleToLength) ? String(scaleToLength[0]) : ''
    expect(workflow[intNodeId]?.inputs.value).toBe(1280)
  })

  it('locks Qwen storyboard workflow parameters before submit', () => {
    const workflowKey = listComfyUiWorkflowKeys().find((key) =>
      key.includes('baseimage/')
      && key.includes('Qwen')
    )

    expect(workflowKey).toBeTruthy()
    expect(getComfyUiWorkflowParameterContract(workflowKey!)).toEqual(expect.objectContaining({
      allowInternalLlmExpansion: false,
      finalOutputNodeIds: ['105'],
    }))

    const workflow = resolveComfyUiWorkflow(workflowKey!, {
      prompt: 'locked current panel prompt',
      negativePrompt: 'locked negative prompt',
      width: 1280,
      height: 720,
      imageFilenames: ['reference.jpg'],
      llmApi: {
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: 'or-test-key',
        model: 'openrouter/test-model',
      },
    })

    const result = validateResolvedWorkflowPreflight(workflowKey!, workflow, {
      prompt: 'locked current panel prompt',
      negativePrompt: 'locked negative prompt',
      width: 1280,
      height: 720,
      imageFilenames: ['reference.jpg'],
      llmApi: {
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: 'or-test-key',
        model: 'openrouter/test-model',
      },
    }, { expect: 'image' })

    expect(result.ok).toBe(true)
    expect(workflow['68']?.inputs.prompt).toBe('locked current panel prompt')
    expect(workflow['61']?.inputs.prompt).toBe('locked negative prompt')
    expect(workflow['105']?.class_type).toBe('SaveImage')
  })

  it('rejects Qwen storyboard workflows when final conditioning is not locked', () => {
    const workflowKey = listComfyUiWorkflowKeys().find((key) =>
      key.includes('baseimage/')
      && key.includes('Qwen')
    )

    expect(workflowKey).toBeTruthy()

    const workflow = resolveComfyUiWorkflow(workflowKey!, {
      prompt: 'locked current panel prompt',
      width: 1280,
      height: 720,
      imageFilenames: ['reference.jpg'],
      llmApi: {
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: 'or-test-key',
        model: 'openrouter/test-model',
      },
    })
    workflow['68']!.inputs.prompt = ['76', 0]

    expect(() => validateResolvedWorkflowPreflight(workflowKey!, workflow, {
      prompt: 'locked current panel prompt',
      width: 1280,
      height: 720,
      imageFilenames: ['reference.jpg'],
      llmApi: {
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: 'or-test-key',
        model: 'openrouter/test-model',
      },
    }, { expect: 'image' })).toThrow('COMFYUI_PREFLIGHT_PROMPT_NOT_LOCKED')
  })

  it('duplicates the last provided reference into every remaining LoadImage slot', () => {
    const workflowKey = 'baseimage/图片编辑/qwen双图编辑'
    expect(getComfyUiWorkflowImageInputCount(workflowKey)).toBeGreaterThan(1)

    const workflow = resolveComfyUiWorkflow(workflowKey, {
      prompt: 'single reference edit',
      width: 1280,
      height: 720,
      imageFilenames: ['only-reference.png'],
    })

    const loadImageNodes = getLoadImageNodes(workflow)
    expect(loadImageNodes.length).toBeGreaterThan(1)
    expect(loadImageNodes.every((node) => node.inputs.image === 'only-reference.png')).toBe(true)
    expect(loadImageNodes.every((node) => !Object.prototype.hasOwnProperty.call(node.inputs, 'upload'))).toBe(true)
    expect(loadImageNodes.every((node) => !Object.prototype.hasOwnProperty.call(node.inputs, 'imageUI'))).toBe(true)
    expect(loadImageNodes.every((node) => !Object.prototype.hasOwnProperty.call(node.inputs, 'imageui'))).toBe(true)
  })

  it('removes bundled demo image inputs when no reference image is injected', () => {
    const workflow = resolveComfyUiWorkflow('baseimage/图片编辑/qwen双图编辑', {
      prompt: 'text only edit should not inherit bundled demo images',
      width: 1280,
      height: 720,
    })

    const loadImageNodes = getLoadImageNodes(workflow)
    expect(loadImageNodes.length).toBeGreaterThan(1)
    expect(loadImageNodes.every((node) => !Object.prototype.hasOwnProperty.call(node.inputs, 'image'))).toBe(true)
    expect(loadImageNodes.every((node) => !Object.prototype.hasOwnProperty.call(node.inputs, 'upload'))).toBe(true)
  })

  it('keeps S2 voice-clone reference transcription prompt separate from render text', () => {
    const workflowKey = listComfyUiWorkflowKeys().find((key) => key.endsWith('/s2-one'))
    expect(workflowKey).toBeTruthy()

    const workflow = resolveComfyUiWorkflow(workflowKey!, {
      prompt: '[中年男声][冷静] 可以。',
      audioFilenames: ['reference.wav'],
    })

    const ttsNode = Object.values(workflow).find((node) => node.class_type === 'FishS2VoiceCloneTTS')
    expect(ttsNode?.inputs.text).toEqual(['33', 0])
    expect(workflow['33']?.inputs.text).toBe('[中年男声][冷静] 可以。')
    expect(workflow['37']?.class_type).toBe('Apply Whisper')
    expect(workflow['37']?.inputs.prompt).toBe('')
  })

  it('locks LTX2.3 profile duration and PromptRelay controls into resolved workflows', () => {
    const largeMotion = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.singleImageLargeMotion, {
      prompt: 'GLOBAL: office\nLOCAL: doctor speaks',
      imageFilenames: ['source.png'],
      fps: 25,
      durationSeconds: 16,
      targetFrameCount: 400,
    })
    expect(largeMotion['1332']?.inputs.length).toBe(400)
    const largeMotionRelay = getPromptRelayNodes(largeMotion)[0]
    expect(largeMotionRelay?.inputs.global_prompt).toBe('office')
    expect(String(largeMotionRelay?.inputs.local_prompts)).toContain('doctor speaks')
    expect(String(largeMotionRelay?.inputs.local_prompts)).toContain('Stage 4')
    expect(largeMotionRelay?.inputs.segment_lengths).toBe('100, 100, 100, 100')
    const largeMotionTimeline = JSON.parse(String(largeMotionRelay?.inputs.timeline_data)) as {
      segments: Array<{ prompt: string; length: number }>
    }
    expect(largeMotionTimeline.segments.map((segment) => segment.length)).toEqual([100, 100, 100, 100])
    expect(largeMotionTimeline.segments[0]?.prompt).toContain('Stage 1')
    expect(largeMotionTimeline.segments[3]?.prompt).toContain('Stage 4')
    expect(JSON.stringify(largeMotionTimeline)).not.toContain('年轻的女人')

    const numberedLocalSections = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.singleImageLargeMotion, {
      prompt: [
        'GLOBAL: office with the same doctor',
        'LOCAL 1: doctor inhales',
        'LOCAL 2: doctor speaks',
        'LOCAL 3: doctor pauses',
        'LOCAL 4: doctor settles',
      ].join('\n'),
      imageFilenames: ['source.png'],
      fps: 25,
      durationSeconds: 16,
      targetFrameCount: 400,
    })
    const numberedRelay = getPromptRelayNodes(numberedLocalSections)[0]
    expect(String(numberedRelay?.inputs.global_prompt)).toContain('office with the same doctor')
    expect(String(numberedRelay?.inputs.local_prompts)).toContain('doctor inhales')
    expect(String(numberedRelay?.inputs.local_prompts)).toContain('doctor speaks')
    expect(String(numberedRelay?.inputs.local_prompts)).toContain('doctor pauses')
    expect(String(numberedRelay?.inputs.local_prompts)).toContain('doctor settles')

    const slowPushIn = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.singleImageLargeMotion, {
      prompt: 'GLOBAL: office\nLOCAL: \u955c\u5934\u7f13\u6162\u63a8\u8fdb\uff0c\u4fdd\u6301\u4e24\u4eba\u548c\u4e66\u684c\u6784\u56fe\u7a33\u5b9a',
      imageFilenames: ['source.png'],
      fps: 25,
      durationSeconds: 12,
      targetFrameCount: 300,
    })
    const slowPushInRelay = getPromptRelayNodes(slowPushIn)[0]
    expect(slowPushInRelay?.inputs.segment_lengths).toBe('75, 75, 75, 75')
    expect(String(slowPushInRelay?.inputs.local_prompts)).toContain('Stage 3: maintain the same slow restrained push-in speed')
    expect(String(slowPushInRelay?.inputs.local_prompts)).not.toContain('strongest continuous movement')

    const enhancedSlowPushIn = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.singleImageLargeMotion, {
      prompt: 'GLOBAL: office\nLOCAL: 12\u79d2\u5355\u955c\u5934\u8fde\u7eed\u63a8\u8fdb\u7d27\u5f20\u611f\uff0c\u53ea\u4fdd\u7559\u6781\u8f7b\u5fae\u7684\u7a33\u5b9a\u5185\u538b\u8282\u594f',
      imageFilenames: ['source.png'],
      fps: 25,
      durationSeconds: 12,
      targetFrameCount: 300,
    })
    const enhancedSlowPushInRelay = getPromptRelayNodes(enhancedSlowPushIn)[0]
    expect(String(enhancedSlowPushInRelay?.inputs.local_prompts)).toContain('Stage 3: maintain the same slow restrained push-in speed')
    expect(String(enhancedSlowPushInRelay?.inputs.local_prompts)).not.toContain('strongest continuous movement')

    const stabilizedEnhancedPrompt = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.singleImageLargeMotion, {
      prompt: 'GLOBAL: office\nLOCAL: \u4fdd\u6301\u6e90\u56fe\u7684\u4fef\u62cd\u8fdc\u666f\u4e0e\u7a33\u5b9a\u6784\u56fe\uff0c12\u79d2\u5355\u955c\u5934\u8fde\u7eed\u52a8\u4f5c\u53ea\u4fdd\u7559\u514b\u5236\u7684\u547c\u5438\u3001\u8f7b\u5fae\u7728\u773c\u548c\u6781\u7ec6\u5c0f\u7684\u59ff\u6001\u53d8\u5316',
      imageFilenames: ['source.png'],
      fps: 25,
      durationSeconds: 12,
      targetFrameCount: 300,
    })
    const stabilizedRelay = getPromptRelayNodes(stabilizedEnhancedPrompt)[0]
    expect(String(stabilizedRelay?.inputs.local_prompts)).toContain('Stage 3: maintain the same slow restrained push-in speed')
    expect(String(stabilizedRelay?.inputs.local_prompts)).not.toContain('strongest continuous movement')

    const barelyVisiblePushIn = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.singleImageLargeMotion, {
      prompt: 'GLOBAL: office\nLOCAL: \u955c\u5934\u5168\u7a0b\u7a33\u5b9a\uff0c\u4ec5\u5728\u539f\u6709\u6784\u56fe\u5185\u505a\u51e0\u4e4e\u4e0d\u53ef\u5bdf\u89c9\u7684\u7f13\u6162\u538b\u8fd1\uff0c\u52a8\u4f5c\u81ea\u7136\u8fde\u8d2f',
      imageFilenames: ['source.png'],
      fps: 25,
      durationSeconds: 12,
      targetFrameCount: 300,
    })
    const barelyVisibleRelay = getPromptRelayNodes(barelyVisiblePushIn)[0]
    expect(String(barelyVisibleRelay?.inputs.local_prompts)).toContain('Stage 3: maintain the same slow restrained push-in speed')
    expect(String(barelyVisibleRelay?.inputs.local_prompts)).not.toContain('strongest continuous movement')

    const damaicha30s = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.damaichaImageTo30s, {
      prompt: 'GLOBAL: office\nLOCAL: doctor speaks',
      imageFilenames: ['source.png'],
      fps: 25,
      durationSeconds: 20,
      targetFrameCount: 500,
    })
    expect(damaicha30s['158']?.inputs.a).toBe(20)

    const damaichaPromptRelay = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.damaichaLongPromptRelay, {
      prompt: 'GLOBAL: office\nLOCAL: doctor speaks',
      imageFilenames: ['source.png'],
      fps: 25,
      durationSeconds: 20,
      targetFrameCount: 500,
    })
    expect(damaichaPromptRelay['361']?.inputs.value).toBe(20)
    const damaichaRelay = getPromptRelayNodes(damaichaPromptRelay)[0]
    expect(damaichaRelay?.inputs.segment_lengths).toBe('100, 100, 100, 100, 100')
    expect(String(damaichaRelay?.inputs.timeline_data)).not.toContain('年轻女性身穿浅灰色针织衫')

    const aio = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.damaichaAioV2, {
      prompt: 'GLOBAL: office\nLOCAL: doctor speaks',
      imageFilenames: ['source.png'],
      fps: 25,
      durationSeconds: 8,
      targetFrameCount: 200,
    })
    expect(aio['472']?.inputs.value).toBe(8)
    expect(getPromptRelayNodes(aio)[0]?.inputs.segment_lengths).toBe('67, 67, 66')
  })

  it('keeps bundled LoadAudio placeholders for LTX2.3 workflows when no audio is injected', () => {
    for (const profile of getLtx23WorkflowProfiles()) {
      const workflow = resolveComfyUiWorkflow(profile.workflowKey, {
        prompt: 'quiet shot',
        imageFilenames: ['source.png'],
        fps: profile.fps,
        durationSeconds: profile.defaultDurationSeconds,
      })
      const loadAudioNodes = getLoadAudioNodes(workflow)
      for (const node of loadAudioNodes) {
        expect(node.inputs.audio).toEqual(expect.any(String))
        expect(String(node.inputs.audio).trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('drops dangling LTX2.3 video output nodes before ComfyUI validation', () => {
    const workflow = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.microDetail, {
      prompt: 'quiet shot',
      imageFilenames: ['source.png'],
      fps: 25,
      durationSeconds: 4,
    })

    const videoOutputs = Object.values(workflow).filter((node) =>
      node.class_type === 'VHS_VideoCombine'
    )

    expect(videoOutputs.length).toBeGreaterThan(0)
    expect(videoOutputs.every((node) => Object.prototype.hasOwnProperty.call(node.inputs, 'images'))).toBe(true)
  })

  it('locks the KJ multi-shot workflow to project PromptRelay timing and 720p controls', () => {
    expect(comfyUiWorkflowRequiresLlmApi(COMFYUI_LTX23_WORKFLOW_KEYS.multiShotPromptRelayKj)).toBe(false)

    const workflow = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.multiShotPromptRelayKj, {
      prompt: [
        'GLOBAL: 同一电影级连续镜头，主体与光影保持一致',
        'LOCAL 1: 雄鹰在高空振翅飞行',
        'LOCAL 2: 镜头推近雄鹰的瞳孔',
        'LOCAL 3: 瞳孔中的赛博朋克城市逐渐清晰',
        'LENGTHS: 50, 100, 150',
      ].join('\n'),
      imageFilenames: ['source.png'],
      width: 1280,
      height: 720,
      fps: 25,
      durationSeconds: 12,
      targetFrameCount: 300,
      motionStrength: 2,
    })

    const relay = getPromptRelayNodes(workflow).find((node) => node.class_type === 'PromptRelayEncode')
    expect(relay).toBeTruthy()
    expect(relay?.inputs.global_prompt).toBe('同一电影级连续镜头，主体与光影保持一致')
    expect(relay?.inputs.local_prompts).toBe(
      '雄鹰在高空振翅飞行 | 镜头推近雄鹰的瞳孔 | 瞳孔中的赛博朋克城市逐渐清晰',
    )
    expect(relay?.inputs.segment_lengths).toBe('50, 100, 150')

    expect(workflow['584']?.inputs.image).toBe('source.png')
    expect(workflow['618']?.inputs.value).toBe(300)
    expect(workflow['619']?.inputs).toMatchObject({
      aspect_ratio: '16:9',
      round_to_multiple: '8',
      scale_to_side: 'longest',
      scale_to_length: 1280,
    })
    expect(workflow['604']?.class_type).toBe('VHS_VideoCombine')
    expect(workflow['604']?.inputs.frame_rate).toBe(25)
    expect(workflow['620']?.inputs['num_images.strength_1']).toBe(0.85)

    const negativeNode = workflow['420']
    const negativeText = String(negativeNode?.inputs.text ?? '')
    expect(negativeNode?.class_type).toBe('CLIPTextEncode')
    expect(negativeNode?.inputs.clip).toEqual(['416', 0])
    expect(negativeNode?._meta?.title).toBe('KJ no-subtitles negative prompt')
    expect(negativeText.toLowerCase()).toContain('subtitle')
    expect(negativeText.toLowerCase()).toContain('caption')
    expect(negativeText.toLowerCase()).toContain('burned-in text')
    expect(negativeText.toLowerCase()).toContain('lower third')
    expect(negativeText).toContain('Chinese characters')
    expect(negativeText).toContain('English letters')
    expect(negativeText.toLowerCase()).toContain('watermark')
    expect(workflow['164']?.inputs.negative).toEqual(['420', 0])

    const classTypes = Object.values(workflow).map((node) => node.class_type)
    expect(classTypes).not.toContain('ConditioningZeroOut')
    expect(classTypes).not.toContain('RH_CODEX_NODE')
    expect(classTypes).not.toContain('RegexExtract')
    expect(classTypes).not.toContain('PreviewAny')
  })

  it('rejects a malformed KJ no-subtitles conditioning contract', () => {
    writeExternalWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.multiShotPromptRelayKj, {
      '416': { class_type: 'CLIPLoader', inputs: {} },
      '605': {
        class_type: 'PromptRelayEncode',
        inputs: {
          clip: ['416', 0],
          global_prompt: '',
          local_prompts: '',
          segment_lengths: '',
        },
      },
      '420': {
        class_type: 'ConditioningZeroOut',
        inputs: { conditioning: ['605', 1] },
      },
      '164': {
        class_type: 'LTXVConditioning',
        inputs: { positive: ['605', 1], negative: ['701', 0], frame_rate: 25 },
      },
      '700': {
        class_type: 'PromptRelayEncode',
        inputs: { clip: ['416', 0] },
      },
      '701': {
        class_type: 'ConditioningZeroOut',
        inputs: { conditioning: ['700', 1] },
      },
    })

    expect(() => resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.multiShotPromptRelayKj, {
      prompt: 'GLOBAL: office\nLOCAL 1: prepare\nLOCAL 2: move\nLOCAL 3: settle',
      imageFilenames: ['source.png'],
      targetFrameCount: 225,
    })).toThrow('COMFYUI_LTX23_KJ_NO_SUBTITLE_CONDITIONING_INVALID')
  })

  it.each([
    [undefined, 1],
    [1, 1],
    [2, 0.85],
    [3, 0.7],
    [99, 1],
  ])('maps KJ motion strength %s to image-guide strength %s', (motionStrength, expectedGuideStrength) => {
    const workflow = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.multiShotPromptRelayKj, {
      prompt: 'GLOBAL: office\nLOCAL 1: prepare\nLOCAL 2: move\nLOCAL 3: settle',
      imageFilenames: ['source.png'],
      targetFrameCount: 100,
      ...(motionStrength === undefined ? {} : { motionStrength }),
    })

    expect(workflow['620']?.inputs['num_images.strength_1']).toBe(expectedGuideStrength)
  })

  it('normalizes KJ multi-shot LENGTHS to the requested frame count and falls back on invalid counts', () => {
    const normalized = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.multiShotPromptRelayKj, {
      prompt: 'GLOBAL: office\nLOCAL 1: prepare\nLOCAL 2: move\nLOCAL 3: settle\nLENGTHS: 1, 2, 1',
      imageFilenames: ['source.png'],
      targetFrameCount: 100,
    })
    expect(getPromptRelayNodes(normalized)[0]?.inputs.segment_lengths).toBe('25, 50, 25')

    const invalid = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.multiShotPromptRelayKj, {
      prompt: 'GLOBAL: office\nLOCAL 1: prepare\nLOCAL 2: move\nLOCAL 3: settle\nLENGTHS: 30, nope',
      imageFilenames: ['source.png'],
      targetFrameCount: 100,
    })
    expect(getPromptRelayNodes(invalid)[0]?.inputs.segment_lengths).toBe('34, 33, 33')

    const codexStagesWithoutLengths = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.multiShotPromptRelayKj, {
      prompt: 'GLOBAL: office\nLOCAL 1: prepare\nLOCAL 2: move\nLOCAL 3: settle',
      imageFilenames: ['source.png'],
      fps: 25,
      durationSeconds: 6,
      targetFrameCount: 150,
    })
    expect(getPromptRelayNodes(codexStagesWithoutLengths)[0]?.inputs.segment_lengths).toBe('50, 50, 50')

    const modelTimedStages = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.multiShotPromptRelayKj, {
      prompt: 'GLOBAL: office\nLOCAL 1: prepare\nLOCAL 2: move\nLOCAL 3: settle\nLENGTHS: 45, 105, 75',
      imageFilenames: ['source.png'],
      fps: 25,
      durationSeconds: 9,
      targetFrameCount: 225,
    })
    const modelTimedRelay = getPromptRelayNodes(modelTimedStages)[0]
    expect(modelTimedRelay?.inputs.segment_lengths).toBe('45, 105, 75')
  })

  it('keeps KJ LENGTHS when project safety constraints follow the structured prompt', () => {
    const workflow = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.multiShotPromptRelayKj, {
      prompt: [
        'GLOBAL: office',
        'LOCAL 1: prepare',
        'LOCAL 2: move',
        'LOCAL 3: settle',
        'LENGTHS: 1, 2, 1. Source-frame continuity lock: preserve the subject and room.',
      ].join('\n'),
      imageFilenames: ['source.png'],
      targetFrameCount: 100,
    })

    expect(getPromptRelayNodes(workflow)[0]?.inputs.segment_lengths).toBe('25, 50, 25')
  })

  it.each([
    [1920, 1080, '16:9'],
    [1080, 1920, '9:16'],
  ])('locks KJ %sx%s requests to fixed 720p while preserving %s', (width, height, aspectRatio) => {
    const workflow = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.multiShotPromptRelayKj, {
      prompt: 'GLOBAL: office\nLOCAL 1: prepare\nLOCAL 2: move\nLOCAL 3: settle',
      imageFilenames: ['source.png'],
      width,
      height,
      targetFrameCount: 100,
    })

    expect(workflow['619']?.inputs).toMatchObject({
      aspect_ratio: aspectRatio,
      round_to_multiple: '8',
      scale_to_side: 'longest',
      scale_to_length: 1280,
    })
  })

  it('locks PromptRelaySmartEncode global and smart prompts for updated single-image workflows', () => {
    for (const workflowKey of [
      COMFYUI_LTX23_WORKFLOW_KEYS.singleImagePrecise,
      COMFYUI_LTX23_WORKFLOW_KEYS.microDetail,
    ]) {
      const workflow = resolveComfyUiWorkflow(workflowKey, {
        prompt: 'GLOBAL: office scene\nLOCAL: doctor raises glasses',
        imageFilenames: ['source.png'],
        audioFilenames: ['silence.wav'],
        fps: 25,
        durationSeconds: 6,
        targetFrameCount: 150,
      })

      const relay = getPromptRelayNodes(workflow).find((node) => node.class_type === 'PromptRelaySmartEncode')
      expect(relay).toBeTruthy()

      const globalPromptSourceId = Array.isArray(relay?.inputs.global_prompt)
        ? String(relay.inputs.global_prompt[0])
        : ''
      const smartPromptSourceId = Array.isArray(relay?.inputs.smart_prompt)
        ? String(relay.inputs.smart_prompt[0])
        : ''

      expect(workflow[globalPromptSourceId]?.inputs.prompt).toBe('office scene')
      expect(workflow[smartPromptSourceId]?.inputs.prompt).toBe(
        'doctor raises glasses [0-38] | doctor raises glasses [38-76] | doctor raises glasses [76-113] | doctor raises glasses [113-150]',
      )
    }
  })

  it('splits same-line GLOBAL and LOCAL sections for PromptRelaySmartEncode workflows', () => {
    const workflow = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.singleImagePrecise, {
      prompt: 'GLOBAL: office scene with two men at a desk. LOCAL: the doctor leans forward and speaks calmly.',
      imageFilenames: ['source.png'],
      audioFilenames: ['silence.wav'],
      fps: 25,
      durationSeconds: 6,
      targetFrameCount: 150,
    })

    const relay = getPromptRelayNodes(workflow).find((node) => node.class_type === 'PromptRelaySmartEncode')
    expect(relay).toBeTruthy()

    const globalPromptSourceId = Array.isArray(relay?.inputs.global_prompt)
      ? String(relay.inputs.global_prompt[0])
      : ''
    const smartPromptSourceId = Array.isArray(relay?.inputs.smart_prompt)
      ? String(relay.inputs.smart_prompt[0])
      : ''

    expect(workflow[globalPromptSourceId]?.inputs.prompt).toBe('office scene with two men at a desk.')
    const smartPrompt = String(workflow[smartPromptSourceId]?.inputs.prompt ?? '')
    expect(smartPrompt).toContain('the doctor leans forward and speaks calmly.')
    expect(smartPrompt).toContain('Audio-backed talking-head:')
    expect(smartPrompt).toContain('same visible subject count')
    expect(smartPrompt.toLowerCase()).not.toContain('no profile turn')
    expect(smartPrompt.toLowerCase()).not.toContain('no subtitles')
    expect(smartPrompt).toContain('[113-150]')
    expect(smartPrompt).not.toContain('same single visible subject')
  })

  it('locks Smart VBVR image, audio, frame count, and trim duration controls', () => {
    const workflow = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.singleImagePrecise, {
      prompt: 'GLOBAL: office scene\nLOCAL: person speaks calmly to camera',
      imageFilenames: ['source.png'],
      audioFilenames: ['voice.wav'],
      fps: 25,
      durationSeconds: 6,
      targetFrameCount: 150,
    })

    expect(workflow['620']?.class_type).toBe('LoadImage')
    expect(workflow['620']?.inputs.image).toBe('source.png')
    expect(workflow['627']?.class_type).toBe('LoadAudio')
    expect(workflow['627']?.inputs.audio).toBe('voice.wav')
    expect(workflow['623']?.inputs.value).toBe(150)
    expect(workflow['628']?.class_type).toBe('TrimAudioDuration')
    expect(workflow['628']?.inputs.duration).toBe(6)
    expect(workflow['604']?.class_type).toBe('VHS_VideoCombine')
    expect(workflow['604']?.inputs.audio).toEqual(['550', 0])
  })

  it('builds repeated positive talking-head Smart VBVR stages for audio-backed single-local prompts', () => {
    const workflow = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.singleImagePrecise, {
      prompt: '中年男子坐在书桌后方靠墙的办公椅上微微前倾，镜片反着白炽灯冷光，嘴唇开合正在说话，办公室压抑安静，镜头缓缓推近',
      imageFilenames: ['source.png'],
      audioFilenames: ['voice.wav'],
      fps: 25,
      durationSeconds: 10.34,
      targetFrameCount: 259,
    })

    const relay = getPromptRelayNodes(workflow).find((node) => node.class_type === 'PromptRelaySmartEncode')
    expect(relay).toBeTruthy()

    const smartPromptSourceId = Array.isArray(relay?.inputs.smart_prompt)
      ? String(relay.inputs.smart_prompt[0])
      : ''
    const smartPrompt = String(workflow[smartPromptSourceId]?.inputs.prompt ?? '')

    expect(smartPrompt).toContain('[0-65]')
    expect(smartPrompt).toContain('[195-259]')
    expect(smartPrompt).toContain('requested head and gaze direction')
    expect(smartPrompt).toContain('lower portion of the frame stays clean')
    expect(smartPrompt.toLowerCase()).not.toContain('no profile turn')
    expect(smartPrompt.toLowerCase()).not.toContain('no new people')
    expect(smartPrompt.toLowerCase()).not.toContain('no subtitles')
    expect(smartPrompt.toLowerCase()).not.toContain('rotation')
    expect(smartPrompt.toLowerCase()).not.toContain('crowd')
    expect(new Set(smartPrompt.split(' | ').map((segment) => segment.replace(/\s*\[\d+-\d+\]$/, '').trim())).size).toBe(1)
  })

  it('keeps Chinese speaking action but strips subtitle and dialogue-text instructions from Smart VBVR audio prompts', () => {
    const workflow = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.singleImagePrecise, {
      prompt: '中年医生坐在办公室里正在说话，嘴唇开合，画面无字幕，不显示台词文字，字幕不能出现',
      imageFilenames: ['source.png'],
      audioFilenames: ['voice.wav'],
      fps: 25,
      durationSeconds: 10,
      targetFrameCount: 250,
    })

    const relay = getPromptRelayNodes(workflow).find((node) => node.class_type === 'PromptRelaySmartEncode')
    expect(relay).toBeTruthy()

    const smartPromptSourceId = Array.isArray(relay?.inputs.smart_prompt)
      ? String(relay.inputs.smart_prompt[0])
      : ''
    const smartPrompt = String(workflow[smartPromptSourceId]?.inputs.prompt ?? '')

    expect(smartPrompt).toContain('正在说话')
    expect(smartPrompt).toContain('Audio-backed talking-head')
    expect(smartPrompt).not.toMatch(/字幕|台词|文字/)
  })

  it('uses real negative text conditioning for audio-backed Smart VBVR subtitle suppression', () => {
    const workflow = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.singleImagePrecise, {
      prompt: [
        'GLOBAL: night office, Chen Ji, same source-frame composition, stable lighting.',
        'LOCAL: Chen Ji sits near the right-side window, turns his face toward the window, and speaks softly.',
      ].join('\n'),
      imageFilenames: ['source.png'],
      audioFilenames: ['voice.wav'],
      fps: 25,
      durationSeconds: 6,
      targetFrameCount: 150,
    })

    const negativeSourceId = Array.isArray(workflow['164']?.inputs.negative)
      ? String(workflow['164'].inputs.negative[0])
      : ''
    const negativeNode = workflow[negativeSourceId]
    const negativeText = String(negativeNode?.inputs.text ?? '')

    expect(negativeNode?.class_type).toBe('CLIPTextEncode')
    expect(negativeNode?.inputs.clip).toEqual(['416', 0])
    expect(negativeText.toLowerCase()).toContain('subtitle')
    expect(negativeText.toLowerCase()).toContain('caption')
    expect(negativeText.toLowerCase()).toContain('lower third')
    expect(negativeText).toContain('Chinese characters')
    expect(Object.values(workflow).some((node) => node.class_type === 'ConditioningZeroOut')).toBe(false)

    const relay = getPromptRelayNodes(workflow).find((node) => node.class_type === 'PromptRelaySmartEncode')
    const smartPromptSourceId = Array.isArray(relay?.inputs.smart_prompt)
      ? String(relay.inputs.smart_prompt[0])
      : ''
    const smartPrompt = String(workflow[smartPromptSourceId]?.inputs.prompt ?? '')

    expect(smartPrompt).toContain('turns his face toward the window')
    expect(smartPrompt).toContain('requested head and gaze direction')
    expect(smartPrompt).toContain('lower portion of the frame stays clean')
    expect(smartPrompt.toLowerCase()).not.toContain('subtitle')
    expect(smartPrompt.toLowerCase()).not.toContain('caption')
    expect(smartPrompt.toLowerCase()).not.toContain('text overlay')
  })

  it('does not inject continuity packet or negative concepts into Smart VBVR positive prompts', () => {
    const workflow = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.singleImagePrecise, {
      prompt: [
        'GLOBAL: night office, Doctor, same source-frame composition, frontal close-up, stable lighting.',
        'LOCAL: Doctor sits behind the desk, leans slightly forward, and speaks calmly to camera.',
      ].join('\n'),
      imageFilenames: ['source.png'],
      audioFilenames: ['voice.wav'],
      fps: 25,
      durationSeconds: 12,
      targetFrameCount: 300,
    })

    const relay = getPromptRelayNodes(workflow).find((node) => node.class_type === 'PromptRelaySmartEncode')
    expect(relay).toBeTruthy()

    const globalPromptSourceId = Array.isArray(relay?.inputs.global_prompt)
      ? String(relay.inputs.global_prompt[0])
      : ''
    const smartPromptSourceId = Array.isArray(relay?.inputs.smart_prompt)
      ? String(relay.inputs.smart_prompt[0])
      : ''
    const globalPrompt = String(workflow[globalPromptSourceId]?.inputs.prompt ?? '')
    const smartPrompt = String(workflow[smartPromptSourceId]?.inputs.prompt ?? '')
    const combined = `${globalPrompt}\n${smartPrompt}`.toLowerCase()

    expect(globalPrompt).toContain('night office')
    expect(smartPrompt).toContain('[0-75]')
    expect(smartPrompt).toContain('[225-300]')
    expect(combined).not.toContain('panel continuity packet')
    expect(combined).not.toContain('hard constraints')
    expect(combined).not.toContain('crowd')
    expect(combined).not.toContain('guards')
    expect(combined).not.toContain('police')
    expect(combined).not.toContain('subtitles')
    expect(combined).not.toContain('profile turn')
    expect(combined).not.toContain('new people')
  })

  it('sanitizes raw continuity packet fallback before Smart VBVR injection', () => {
    const workflow = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.singleImagePrecise, {
      prompt: [
        'Panel continuity packet:',
        'Current shot action: Doctor sits behind the desk, leans slightly forward, and speaks calmly to camera.',
        'Hard constraints:',
        'Do not add new people, crowds, guards, police, subtitles, or profile turns.',
      ].join('\n'),
      imageFilenames: ['source.png'],
      audioFilenames: ['voice.wav'],
      fps: 25,
      durationSeconds: 12,
      targetFrameCount: 300,
    })

    const relay = getPromptRelayNodes(workflow).find((node) => node.class_type === 'PromptRelaySmartEncode')
    expect(relay).toBeTruthy()

    const smartPromptSourceId = Array.isArray(relay?.inputs.smart_prompt)
      ? String(relay.inputs.smart_prompt[0])
      : ''
    const smartPrompt = String(workflow[smartPromptSourceId]?.inputs.prompt ?? '')
    const normalized = smartPrompt.toLowerCase()

    expect(smartPrompt).toContain('Doctor sits behind the desk')
    expect(normalized).not.toContain('panel continuity packet')
    expect(normalized).not.toContain('hard constraints')
    expect(normalized).not.toContain('crowd')
    expect(normalized).not.toContain('guards')
    expect(normalized).not.toContain('police')
    expect(normalized).not.toContain('subtitles')
    expect(normalized).not.toContain('profile')
    expect(normalized).not.toContain('new people')
  })

  it('maps Smart VBVR content segments across the requested audio-backed duration', () => {
    const workflow = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.singleImagePrecise, {
      prompt: [
        'GLOBAL: same subject as the reference image, preserve identity and lighting',
        'LOCAL: subject walks in rain [0-120] | camera moves up toward the face [120-240] | subject turns naturally [240-360] | subject waves once [360-420] | camera pulls back [420-489]',
      ].join('\n'),
      imageFilenames: ['source.png'],
      audioFilenames: ['voice.wav'],
      fps: 25,
      durationSeconds: 19.56,
      targetFrameCount: 489,
    })

    const relay = getPromptRelayNodes(workflow).find((node) => node.class_type === 'PromptRelaySmartEncode')
    expect(relay).toBeTruthy()

    const smartPromptSourceId = Array.isArray(relay?.inputs.smart_prompt)
      ? String(relay.inputs.smart_prompt[0])
      : ''

    expect(workflow['623']?.inputs.value).toBe(489)
    expect(workflow['628']?.inputs.duration).toBe(19.56)
    expect(workflow[smartPromptSourceId]?.inputs.prompt).toBe(
      'subject walks in rain [0-98] | camera moves up toward the face [98-196] | subject turns naturally [196-294] | subject waves once [294-392] | camera pulls back [392-489]',
    )
  })

  it('drops disabled video outputs when an active video output remains', () => {
    const workflow = resolveComfyUiWorkflow(COMFYUI_LTX23_WORKFLOW_KEYS.damaichaLongPromptRelay, {
      prompt: 'quiet shot',
      imageFilenames: ['source.png'],
      audioFilenames: ['silence.wav'],
      fps: 25,
      durationSeconds: 12,
      targetFrameCount: 300,
    })

    const videoOutputs = Object.entries(workflow)
      .filter(([, node]) => node.class_type === 'VHS_VideoCombine')
      .map(([nodeId, node]) => ({ nodeId, saveOutput: node.inputs.save_output }))

    expect(videoOutputs).toEqual([{ nodeId: '280', saveOutput: true }])
  })

  it('registers the three bundled MiniMax H3 FL2VA workflows', () => {
    const workflowKeys = listComfyUiWorkflowKeys()

    expect(workflowKeys).toContain('basevideo/h3/fl2va-first-frame')
    expect(workflowKeys).toContain('basevideo/h3/fl2va-last-frame')
    expect(workflowKeys).toContain('basevideo/h3/fl2va-first-last-frame')
    expect(getComfyUiWorkflowImageInputCount('basevideo/h3/fl2va-first-frame')).toBe(1)
    expect(getComfyUiWorkflowImageInputCount('basevideo/h3/fl2va-first-last-frame')).toBe(2)
  })

  it('injects H3 first and last frames with the requested prompt and target shape', () => {
    const workflow = resolveComfyUiWorkflow('basevideo/h3/fl2va-first-last-frame', {
      prompt: 'The actor crosses the room while the camera arcs left.',
      imageFilenames: ['first.png', 'last.png'],
      width: 832,
      height: 480,
      durationSeconds: 6,
      fps: 24,
    })

    expect(workflow['4']).toMatchObject({
      class_type: 'LoadImage',
      inputs: { image: 'first.png' },
      _meta: { title: 'First frame' },
    })
    expect(workflow['6']).toMatchObject({
      class_type: 'LoadImage',
      inputs: { image: 'last.png' },
      _meta: { title: 'Last frame' },
    })
    expect(workflow['7']?.inputs).toMatchObject({
      aspect_ratio: '16:9',
      duration_seconds: 6,
      width: 832,
      height: 480,
    })
    expect(workflow['8']?.inputs.prompt).toBe(
      'The actor crosses the room while the camera arcs left.',
    )
    expect(workflow['10']?.inputs).toMatchObject({
      sigma_points: 21,
      accel: 'off',
      sampler_mode: 'res_multistep',
    })
    expect(workflow['12']?.inputs.fps).toBe(24)
  })

  it('uses first and last frame titles instead of numeric node order for image slots', () => {
    writeExternalWorkflow('basevideo/h3/test-title-aware-slots', {
      '1': {
        class_type: 'LoadImage',
        inputs: { image: 'last-placeholder.png' },
        _meta: { title: 'Last frame' },
      },
      '2': {
        class_type: 'LoadImage',
        inputs: { image: 'first-placeholder.png' },
        _meta: { title: 'First frame' },
      },
      '3': {
        class_type: 'ImageBlend',
        inputs: { image1: ['2', 0], image2: ['1', 0], blend_factor: 0.5, blend_mode: 'normal' },
      },
      '4': {
        class_type: 'SaveImage',
        inputs: { images: ['3', 0], filename_prefix: 'test' },
      },
    })

    const workflow = resolveComfyUiWorkflow('basevideo/h3/test-title-aware-slots', {
      imageFilenames: ['first.png', 'last.png'],
    })

    expect(workflow['2']?.inputs.image).toBe('first.png')
    expect(workflow['1']?.inputs.image).toBe('last.png')
  })

})
