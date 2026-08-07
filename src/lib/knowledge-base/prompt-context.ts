export const KNOWLEDGE_CONTEXT_KINDS = [
  'character_visual',
  'storyboard_detail',
  'acting_direction',
  'h3_prompt',
] as const

export type KnowledgeContextKind = typeof KNOWLEDGE_CONTEXT_KINDS[number]

const PREFERENCE_PREAMBLE = [
  'Use this project knowledge base as preference guidance only.',
  'These are recommendations only, not hard constraints.',
  'Do not override explicit user instructions, story facts, saved character identity, selected reference images, current scene requirements, or continuity constraints.',
  'If guidance conflicts with the current scene, prefer the current scene and preserve existing assets.',
].join(' ')

const CONTEXTS: Record<KnowledgeContextKind, string> = {
  character_visual: [
    'Character visual preferences:',
    '- Build a clear face profile before styling: face shape, brow shape, eye shape, nose bridge/profile, mouth shape, jaw/chin, and one memorable identifier when available.',
    '- Use hairstyle, outfit silhouette, accessories, and era-specific materials to support role identity, but avoid same-face repetition across leads.',
    '- For Chinese short-drama/comic aesthetics, prefer clean facial structure, readable brows and eyes, polished hair shape, and clothing details that match social status and genre.',
    '- Keep the adult boundary explicit for mature, seductive, powerful, or romantic archetypes; do not make adult characters read as minors.',
    '- Negative or frail archetypes such as sickly, cold, gloomy, villainous, or tragic beauty are allowed when the story calls for them; express them through visible features, grooming, posture-ready details, and restrained styling instead of deleting the archetype.',
    '- Do not force beauty-template wording onto male characters, non-human characters, historical figures, or story-specific appearances.',
  ].join('\n'),
  storyboard_detail: [
    'Storyboard and lens-language preferences:',
    '- Choose one main shot scale and one clear camera movement per panel unless the story requires a static close-up.',
    '- Match lens language to narrative purpose: establishing shots for new spaces, medium shots for interaction, close-ups for emotional decisions or key props, low/high angles only when power relation or scale needs it.',
    '- Keep each video_prompt concrete and motion-ready: visible body action, micro-expression, gaze, fabric/hair/environment motion, and camera movement should serve the current source_text.',
    '- Avoid generic static panels. Use stillness only when it is an intentional emotional close-up, prop insert, or suspense beat.',
    '- Do not add plot, characters, props, readable text, or locations that are not grounded in the current panel inputs.',
  ].join('\n'),
  acting_direction: [
    'Acting and expression preferences:',
    '- Translate emotion into visible details: eyes, brows, mouth, jaw, breathing, shoulders, hands, head angle, body weight, and gaze direction.',
    '- Use layered micro-expression rather than one abstract label; a character can look restrained, sickly, cold, shy, guilty, seductive, or threatening only through observable behavior.',
    '- Keep performance scale aligned with scene_type: small controlled beats for daily scenes, progressive eye and breath changes for emotion scenes, sharper body mechanics for action, ceremonial posture for epic, guarded gaze and tension for suspense.',
    '- Preserve the adult boundary for romantic, seductive, powerful, or villain archetypes; avoid childlike wording unless the character is explicitly a minor.',
    '- Do not overwrite character names, panel order, or story meaning.',
  ].join('\n'),
  h3_prompt: [
    'MiniMax H3 prompt protocol and motion preferences:',
    '- Keep the H3 body organized around integrated_multimodal_description, overall_soundscape, and non_diegetic_music; do not add extra labeled sections.',
    '- In integrated_multimodal_description, write the timeline as a shot script: style, shot scale, subject, action, camera movement, and visible in-world sounds.',
    '- Camera movement should be natural English, not tag stacking: movement type with amplitude and speed, such as a small slow push-in or a large fast pan.',
    '- For I2VA, anchor Picture 1 first, then continue as: starting state, action begins, continuous development, result or reaction.',
    '- For FL2VA, write the path between frames: start state, observable middle changes, shrinking differences, then settle into Picture 2 pose, spacing, framing, lighting, and composition.',
    '- Use timed beats when the action has multiple phases, endpoint differences are large, or duration is long enough to need pacing; write them inside one continuous [Shot 1] as From 0.00 to 2.00 seconds..., not as cuts unless the user explicitly asks for multiple shots.',
    '- Prefer one main motion or one emotional turn that can physically happen within the requested duration.',
    '- Always preserve visible identity, face shape, hairstyle, wardrobe, lighting, environment, props, and screen direction from the provided frame(s).',
    '- For first/last-frame transitions, connect START to END with plausible body mechanics and camera behavior; avoid cuts, dissolves, teleporting, new locations, new props, new characters, and no shot-scale jumps.',
    '- overall_soundscape is for environment, action, and non-verbal human sounds only; keep dialogue, singing, and diegetic music out of it.',
    '- non_diegetic_music should name concrete instruments, tempo, rhythm, and dynamics, or use N/A when no audience-only score is needed.',
    '- Current project H3 prompts should not invent dialogue, lyrics, captions, readable text, or unsupported task modes.',
  ].join('\n'),
}

export function getKnowledgePromptContext(kind: KnowledgeContextKind): string {
  return `${PREFERENCE_PREAMBLE}\n${CONTEXTS[kind]}`
}
