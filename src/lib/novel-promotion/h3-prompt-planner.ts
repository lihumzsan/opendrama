import { createHash } from 'crypto'
import { executeAiVisionStep } from '@/lib/ai-runtime'
import type { MiniMaxH3Mode } from '@/lib/providers/comfyui/minimax-h3'

const REQUIRED_FIELDS = [
  'integrated_multimodal_description',
  'overall_soundscape',
  'non_diegetic_music',
] as const

export type MiniMaxH3PromptPlanInput = {
  userId: string
  projectId: string
  analysisModel: string | null | undefined
  mode: MiniMaxH3Mode
  creatorPrompt: string
  continuityPrompt: string
  durationSeconds: number
  firstFrameUrl: string
  lastFrameUrl?: string
  aspectRatio: string
}

export type MiniMaxH3PromptPlan = {
  prompt: string
  fingerprint: string
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function buildPlannerPrompt(input: MiniMaxH3PromptPlanInput): string {
  const pictureInstruction = input.mode === 'fl2va'
    ? 'Picture 1 is the first frame; Picture 2 is the last frame. Preserve identity, wardrobe, setting, lighting, and continuous screen direction while moving from Picture 1 to Picture 2.'
    : 'Picture 1 is the only input frame. Start exactly from Picture 1 and develop natural motion without inventing a final keyframe.'

  return [
    'You are the MiniMax H3 audiovisual prompt planner for a video production workflow.',
    'Analyze the supplied picture(s) in their exact listed order. Do not choose a workflow, image binding, resolution, or frame count; project code owns those controls.',
    pictureInstruction,
    `The target output canvas is ${input.aspectRatio}; frame unavoidable crop safely and do not describe essential action outside that canvas.`,
    `The requested storytelling duration is ${input.durationSeconds} seconds.`,
    'Write one concise English H3 prompt with exactly these three labeled sections, each exactly once:',
    'integrated_multimodal_description: visual action, continuity, camera, lighting, and timed endpoint.',
    'overall_soundscape: synchronized action sounds and ambience. Explicitly prohibit dialogue, narration, singing, and diegetic music.',
    'non_diegetic_music: optional restrained score direction.',
    'Never use H3 dialogue tags such as <d>...</d>. Do not add markdown fences, analysis, or extra labeled sections.',
    `Creator intent: ${input.creatorPrompt}`,
    `Continuity context: ${input.continuityPrompt}`,
  ].join('\n')
}

function validateMiniMaxH3Prompt(prompt: string, mode: MiniMaxH3Mode): string | null {
  if (!prompt) return 'prompt is empty'
  if (/<\s*d\b/i.test(prompt)) return 'prompt contains a dialogue tag'
  for (const field of REQUIRED_FIELDS) {
    const count = (prompt.match(new RegExp(`\\b${field}\\s*:`, 'gi')) || []).length
    if (count !== 1) return `field ${field} must appear exactly once`
  }
  const pictureOneCount = (prompt.match(/\bPicture\s+1\b/gi) || []).length
  if (pictureOneCount === 0) return 'prompt must identify Picture 1'
  const pictureTwoCount = (prompt.match(/\bPicture\s+2\b/gi) || []).length
  if (mode === 'fl2va' && pictureTwoCount === 0) return 'FL2VA prompt must identify Picture 2'
  if (mode === 'i2va' && pictureTwoCount > 0) return 'I2VA prompt cannot identify Picture 2'
  return null
}

export function buildMiniMaxH3PromptFingerprint(input: MiniMaxH3PromptPlanInput): string {
  return createHash('sha256').update(JSON.stringify({
    mode: input.mode,
    creatorPrompt: input.creatorPrompt,
    continuityPrompt: input.continuityPrompt,
    durationSeconds: input.durationSeconds,
    firstFrameUrl: input.firstFrameUrl,
    lastFrameUrl: input.lastFrameUrl || null,
    aspectRatio: input.aspectRatio,
  })).digest('hex')
}

export async function planMiniMaxH3Prompt(input: MiniMaxH3PromptPlanInput): Promise<MiniMaxH3PromptPlan> {
  const analysisModel = readText(input.analysisModel)
  const firstFrameUrl = readText(input.firstFrameUrl)
  const lastFrameUrl = readText(input.lastFrameUrl)
  if (!analysisModel) throw new Error('COMFYUI_MINIMAX_H3_ANALYSIS_MODEL_REQUIRED: configure an analysis model before H3 generation')
  if (!firstFrameUrl || (input.mode === 'fl2va' && !lastFrameUrl) || (input.mode === 'i2va' && lastFrameUrl)) {
    throw new Error(`COMFYUI_MINIMAX_H3_IMAGE_INPUTS_INVALID: ${input.mode} requires its exact first/last-frame image contract`)
  }

  const imageUrls = input.mode === 'fl2va' ? [firstFrameUrl, lastFrameUrl] : [firstFrameUrl]
  const prompt = buildPlannerPrompt(input)
  const first = await executeAiVisionStep({
    userId: input.userId,
    projectId: input.projectId,
    model: analysisModel,
    prompt,
    imageUrls,
    temperature: 0.2,
    reasoning: true,
    action: 'minimax_h3_prompt_plan',
    meta: {
      stepId: 'minimax_h3_prompt_plan',
      stepTitle: 'MiniMax H3 prompt planning',
      stepIndex: 1,
      stepTotal: 1,
    },
  })
  const firstPrompt = readText(first.text)
  const firstError = validateMiniMaxH3Prompt(firstPrompt, input.mode)
  if (!firstError) {
    return { prompt: firstPrompt, fingerprint: buildMiniMaxH3PromptFingerprint(input) }
  }

  const repair = await executeAiVisionStep({
    userId: input.userId,
    projectId: input.projectId,
    model: analysisModel,
    prompt: [
      prompt,
      `The previous answer was invalid because: ${firstError}.`,
      'Return only one corrected H3 prompt that satisfies every required section and picture-role constraint.',
    ].join('\n'),
    imageUrls,
    temperature: 0.2,
    reasoning: true,
    action: 'minimax_h3_prompt_repair',
    meta: {
      stepId: 'minimax_h3_prompt_repair',
      stepTitle: 'MiniMax H3 prompt repair',
      stepIndex: 1,
      stepTotal: 1,
    },
  })
  const repairedPrompt = readText(repair.text)
  const repairError = validateMiniMaxH3Prompt(repairedPrompt, input.mode)
  if (repairError) {
    throw new Error(`COMFYUI_MINIMAX_H3_PROMPT_INVALID: ${repairError}`)
  }
  return { prompt: repairedPrompt, fingerprint: buildMiniMaxH3PromptFingerprint(input) }
}
