const REMOVED_COMFYUI_VIDEO_MODEL_IDS = new Set([
  'basevideo/ltx23-profiles/t8-smart-vbvr-390k-v2',
  'basevideo/demo/Wan2.2Remix',
])

export function isRemovedComfyUiVideoModel(rawModelKeyOrId: string | null | undefined): boolean {
  if (typeof rawModelKeyOrId !== 'string') return false
  const normalized = rawModelKeyOrId.trim().replace(/\\/g, '/').replace(/^comfyui::/, '')
  return normalized.startsWith('basevideo/h3/')
    || REMOVED_COMFYUI_VIDEO_MODEL_IDS.has(normalized)
}
