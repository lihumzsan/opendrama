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

function formatDurationSeconds(value: number): string {
  return value.toFixed(2)
}

function buildAlignmentInstruction(input: Pick<MiniMaxH3PromptPlanInput, 'mode' | 'durationSeconds'>): string {
  if (input.mode === 'i2va') {
    return 'For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.'
  }
  return `How the reference pictures align with the target video — Picture 1 (from [Shot 1]) aligns with the 0.00-second mark of the target video; Picture 2 (from [Shot N]) aligns with the ${formatDurationSeconds(input.durationSeconds)}-second mark of the target video.`
}

function buildPlannerPrompt(input: MiniMaxH3PromptPlanInput): string {
  const durationLabel = formatDurationSeconds(input.durationSeconds)
  const alignmentInstruction = buildAlignmentInstruction(input)
  const pictureInstruction = input.mode === 'fl2va'
    ? 'Picture 1 is the first frame; Picture 2 is the last frame. Preserve identity, wardrobe, setting, lighting, and continuous screen direction while moving from Picture 1 to Picture 2.'
    : 'Picture 1 is the only input frame. Start exactly from Picture 1 at the 0.00-second mark and develop natural motion without inventing a final keyframe.'

  return [
    'You are the MiniMax H3 audiovisual prompt planner for a video production workflow.',
    'Analyze the supplied picture(s) in their exact listed order. Do not choose a workflow, image binding, resolution, or frame count; project code owns those controls.',
    pictureInstruction,
    `The target output canvas is ${input.aspectRatio}; frame unavoidable crop safely and do not describe essential action outside that canvas.`,
    `The requested storytelling duration is ${durationLabel} seconds.`,
    'Deeply observe each picture: subject count, age, wardrobe, expression, pose, setting, era, composition, shot scale, viewpoint, depth of field, light direction, color temperature, palette, and mood.',
    'Design a clear, continuous motion path from the first-frame state to the last-frame state when a last frame is supplied; otherwise design one focused motion or emotional turn that starts from Picture 1.',
    'Keep visible identity, clothing, spatial layout, lighting, and style consistent. Make body mechanics, center of gravity, hair, fabric, water, smoke, particles, and light changes physically plausible.',
    'Describe camera movement as natural English action with type, speed, and amplitude when needed. Prefer one continuous shot unless the creator intent or continuity packet clearly requires a cut.',
    'Synchronize concrete action sounds with visible events such as footsteps, impacts, doors, rain, machinery, fabric movement, or object handling.',
    `The first line of the final prompt must be exactly: ${alignmentInstruction}`,
    'Follow that first line with exactly one blank line, then write exactly these three labeled sections, each exactly once:',
    'integrated_multimodal_description: visual style, initial composition, subjects, timeline, action progression, camera movement, visible in-world non-dialogue sounds, and timed endpoint.',
    'overall_soundscape: 1-4 English sentences for ambience, synchronized action sounds, and non-verbal human sounds only. Do not include dialogue, lyrics, singing, narration, or diegetic music.',
    'non_diegetic_music: 1-3 English sentences describing audience-only score with instruments, tempo, rhythm, dynamics, or write N/A.',
    'For FL2VA, replace [Shot N] in the first line with the actual final shot number; do not output the placeholder N.',
    'Do not create spoken dialogue, voiceover, lyrics, singing, or H3 dialogue tags such as <d>...</d>. Do not add markdown fences, analysis, extra labeled sections, unsupported task modes, or Chinese director notes.',
    `Creator intent: ${input.creatorPrompt}`,
    `Continuity context: ${input.continuityPrompt}`,
  ].join('\n')
}

function validateMiniMaxH3Prompt(prompt: string, input: Pick<MiniMaxH3PromptPlanInput, 'mode' | 'durationSeconds'>): string | null {
  if (!prompt) return 'prompt is empty'
  const normalizedPrompt = prompt.replace(/\r\n?/g, '\n')
  const alignmentInstruction = buildAlignmentInstruction(input)
  if (input.mode === 'i2va') {
    if (!normalizedPrompt.startsWith(`${alignmentInstruction}\n\nintegrated_multimodal_description:`)) {
      return 'I2VA prompt must begin with its alignment instruction followed by one blank line'
    }
  } else {
    const durationLabel = formatDurationSeconds(input.durationSeconds).replace('.', '\\.')
    const alignmentPattern = new RegExp(
      `^How the reference pictures align with the target video — Picture 1 \\(from \\[Shot 1\\]\\) aligns with the 0\\.00-second mark of the target video; Picture 2 \\(from \\[Shot [1-9]\\d*\\]\\) aligns with the ${durationLabel}-second mark of the target video\\.\\n\\nintegrated_multimodal_description:`,
    )
    if (!alignmentPattern.test(normalizedPrompt)) {
      return 'FL2VA prompt must begin with its alignment instruction followed by one blank line and an actual final shot number'
    }
  }
  if (/<\s*d\b/i.test(normalizedPrompt)) return 'prompt contains a dialogue tag'
  for (const field of REQUIRED_FIELDS) {
    const count = (normalizedPrompt.match(new RegExp(`\\b${field}\\s*:`, 'gi')) || []).length
    if (count !== 1) return `field ${field} must appear exactly once`
  }
  const pictureOneCount = (normalizedPrompt.match(/\bPicture\s+1\b/gi) || []).length
  if (pictureOneCount === 0) return 'prompt must identify Picture 1'
  const pictureTwoCount = (normalizedPrompt.match(/\bPicture\s+2\b/gi) || []).length
  if (input.mode === 'fl2va' && pictureTwoCount === 0) return 'FL2VA prompt must identify Picture 2'
  if (input.mode === 'i2va' && pictureTwoCount > 0) return 'I2VA prompt cannot identify Picture 2'
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
  const firstError = validateMiniMaxH3Prompt(firstPrompt, input)
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
  const repairError = validateMiniMaxH3Prompt(repairedPrompt, input)
  if (repairError) {
    throw new Error(`COMFYUI_MINIMAX_H3_PROMPT_INVALID: ${repairError}`)
  }
  return { prompt: repairedPrompt, fingerprint: buildMiniMaxH3PromptFingerprint(input) }
}
