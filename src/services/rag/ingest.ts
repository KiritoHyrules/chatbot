import { initVectorStore, addDocuments } from './vectorstore.js'
import { initEmbedder, embed } from './embed.js'
import { chunkText } from './chunker.js'
import { child } from '../../logger.js'
const log = child('rag:ingest')

export async function ingestDocument(opts: {
  source: string
  title?: string
  rawContent: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  await initEmbedder()
  await initVectorStore()

  const chunks = chunkText(opts.rawContent)
  log.info('Ingestando %s: %d chunks generados', opts.source, chunks.length)

  const rows: Array<{
    id: string
    content: string
    embedding: number[]
    metadata: Record<string, unknown>
    chunkIndex: number
  }> = []

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embed(chunks[i])
    rows.push({
      id: `${opts.source}-${i}`,
      content: chunks[i],
      embedding,
      metadata: {
        source: opts.source,
        title: opts.title ?? opts.source,
        ...opts.metadata,
      },
      chunkIndex: i,
    })
  }

  await addDocuments(rows)
  log.info('Ingesta completada: %s (%d chunks)', opts.source, chunks.length)
}
