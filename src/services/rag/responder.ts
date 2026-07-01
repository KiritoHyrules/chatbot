import type { RetrievedChunk } from './types.js'

export function formatRagResponse(
  chunks: RetrievedChunk[],
  _query: string
): string | null {
  if (chunks.length === 0) return null

  if (chunks.length === 1 && chunks[0].similarity > 0.85) {
    return chunks[0].content
  }

  const parts = chunks.map(c => `• ${c.content}`)
  return `Encontré esta información:\n\n${parts.join('\n\n')}\n\n¿Hay algo más en lo que pueda ayudarte?`
}
