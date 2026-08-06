const CHAPTER_HEADING = /^(?:#{1,6}\s*)?(?:第\s*[0-9一二三四五六七八九十百千]+\s*[章节回]|chapter\s*\d+)[^\n]*$/iu

export function toScreenplaySource(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !CHAPTER_HEADING.test(line.trim()))
    .join('\n')
    .trim()
}
