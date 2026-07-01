import { child } from '../../logger.js'
import type { RetrievedChunk } from './types.js'
const log = child('rag:store')

let _table: unknown = null
let _vectorsCount = 0

export async function initVectorStore(): Promise<void> {
  if (_table) return
  const lancedb = await import('@lancedb/lancedb')
  const db = await lancedb.connect('data/vectors.lance')
  const tables = await db.tableNames()
  if (tables.includes('chunks')) {
    _table = await db.openTable('chunks')
    _vectorsCount = await (_table as { countRows: () => Promise<number> }).countRows()
    log.info('LanceDB conectado: %d vectores existentes', _vectorsCount)
  } else {
    _table = await db.createTable('chunks', [
      { vector: Array(384).fill(0), content: '', metadata: '{}', chunk_index: 0 },
    ])
    // Eliminar fila dummy
    await (_table as { delete: (q: string) => Promise<void> }).delete('chunk_index = 0')
    _vectorsCount = 0
    log.info('LanceDB: nueva tabla chunks creada en data/vectors.lance')
  }
}

export async function addDocuments(
  chunks: Array<{ id: string; content: string; embedding: number[]; metadata: Record<string, unknown>; chunkIndex: number }>
): Promise<void> {
  if (!_table) throw new Error('VectorStore no inicializado.')
  const rows = chunks.map(c => ({
    vector: c.embedding,
    content: c.content,
    metadata: JSON.stringify(c.metadata),
    chunk_index: c.chunkIndex,
  }))
  await (_table as { add: (rows: unknown[]) => Promise<void> }).add(rows)
  _vectorsCount += chunks.length
  log.info('%d chunks insertados (total: %d)', chunks.length, _vectorsCount)
}

export async function search(vector: number[], topK: number): Promise<RetrievedChunk[]> {
  if (!_table) throw new Error('VectorStore no inicializado.')
  const results = await (_table as {
    search: (v: number[]) => { limit: (n: number) => { toArray: () => Promise<Array<{ content: string; metadata: string; _distance: number }>> } }
  }).search(vector).limit(topK).toArray()

  return results.map(r => {
    const similarity = 1 - r._distance
    const metadata = JSON.parse(r.metadata) as Record<string, unknown>
    return { content: r.content, similarity, metadata }
  })
}

export function getStats(): { count: number } {
  return { count: _vectorsCount }
}

export function closeVectorStore(): void {
  _table = null
  _vectorsCount = 0
}
