import { embed, isModelLoaded } from './embed.js'
import { search } from './vectorstore.js'
import { child } from '../../logger.js'
import type { RetrievedChunk, RagOptions } from './types.js'
const log = child('rag:retrieve')

let _errors = 0

export async function retrieveContext(
  query: string,
  options: RagOptions = {}
): Promise<RetrievedChunk[]> {
  if (!isModelLoaded()) {
    log.warn('Modelo no cargado. RAG no disponible.')
    _errors++
    return []
  }

  try {
    const embedding = await embed(query)
    const results = await search(embedding, options.topK ?? 5)

    const threshold = options.threshold ?? 0.75
    const filtered = results.filter(r => r.similarity >= threshold)
    
    if (filtered.length > 0 && results.length > 0 && results[0] !== filtered[0]) {
      log.info('Bajo threshold: mejor similitud=%s, threshold=%s. 0 resultados.', 
        results[0].similarity.toFixed(3), threshold)
    }
    
    return filtered
  } catch (err) {
    log.warn('Error en retrieve: %s', (err as Error)?.message ?? err)
    _errors++
    return []
  }
}

export function getRetrieveErrors(): number {
  return _errors
}
