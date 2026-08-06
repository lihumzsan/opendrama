const MIN_MULTI_EPISODE_IMPORT_LENGTH = 1_000
const CHAPTER_HEADING = /^(?:#{1,6}\s*)?(?:第\s*[0-9一二三四五六七八九十百千]+\s*[章节回]|chapter\s*\d+)[^\n]*$/gimu

export function shouldRecommendSmartSplit(text: string): boolean {
  if (text.trim().length <= MIN_MULTI_EPISODE_IMPORT_LENGTH) return false
  const headings = [...text.matchAll(CHAPTER_HEADING)]
    .map((match) => match[0].trim().toLowerCase())
  return new Set(headings).size >= 2
}
