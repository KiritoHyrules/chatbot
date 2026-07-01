const CHUNK_SIZE_CHARS = 2000
const CHUNK_OVERLAP_CHARS = 200
const MIN_CHUNK_LENGTH = 50

export function chunkText(text: string): string[] {
  if (!text || !text.trim()) return []

  const paragraphs = text.split(/\n{2,}/)
  const chunks: string[] = []

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) continue

    if (trimmed.length <= CHUNK_SIZE_CHARS) {
      if (trimmed.length >= MIN_CHUNK_LENGTH) {
        chunks.push(trimmed)
      }
      continue
    }

    let i = 0
    while (i < trimmed.length) {
      const end = Math.min(i + CHUNK_SIZE_CHARS, trimmed.length)
      const chunk = trimmed.slice(i, end).trim()
      if (chunk.length >= MIN_CHUNK_LENGTH) {
        chunks.push(chunk)
      }
      if (end === trimmed.length) break
      i = end - CHUNK_OVERLAP_CHARS
    }
  }

  return chunks
}
