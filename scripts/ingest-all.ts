import { readFileSync } from 'node:fs'
import { rag } from '../src/services/rag/index.js'

async function main() {
  console.log('[ingest] Inicializando RAG...')
  await rag.init()

  console.log('[ingest] Cargando programas...')
  await rag.ingest({
    source: 'programas.md',
    title: 'Programas CEE',
    rawContent: readFileSync('docs/cee/programas.md', 'utf8'),
    metadata: { type: 'programs', version: 1 },
  })

  console.log('[ingest] Cargando FAQ...')
  await rag.ingest({
    source: 'faq.md',
    title: 'Preguntas Frecuentes',
    rawContent: readFileSync('docs/cee/faq.md', 'utf8'),
    metadata: { type: 'faq', version: 1 },
  })

  console.log('[ingest] Completado.')
  rag.close()
}

main().catch(err => {
  console.error('[ingest] Error:', err?.message ?? err)
  process.exit(1)
})
