export const rnd = () => Math.floor(Math.random() * 800) + 500

export const delayBetween = () => Math.floor(Math.random() * 1000) + 1000

export function splitResponse(body: string, maxLen = 120): string[] {
  if (body.length <= maxLen) return [body]
  const chunks: string[] = []
  const parts = body.split(/\n{2,}/)
  let current = ''
  for (const part of parts) {
    if ((current + '\n\n' + part).trim().length > maxLen && current) {
      chunks.push(current.trim())
      current = part
    } else {
      current += (current ? '\n\n' : '') + part
    }
  }
  if (current) chunks.push(current.trim())
  return chunks.length > 1 ? chunks : [body]
}
