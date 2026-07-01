import { child } from '../../logger.js'
const log = child('rag:embed')

let _pipeline: unknown = null
let _loaded = false

export async function initEmbedder(): Promise<void> {
  if (_loaded) return
  const { pipeline } = await import('@xenova/transformers')
  _pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  _loaded = true
  log.info('Modelo de embeddings cargado: all-MiniLM-L6-v2 (384 dims)')
}

export async function embed(text: string): Promise<number[]> {
  if (!_loaded) throw new Error('Embedder no inicializado. Llama initEmbedder() primero.')
  const pipe = _pipeline as (text: string, opts: { pooling: string; normalize: boolean }) => Promise<{ data: Float32Array }>
  const result = await pipe(text, { pooling: 'mean', normalize: true })
  return Array.from(result.data)
}

export function isModelLoaded(): boolean {
  return _loaded
}
