import { initEmbedder, isModelLoaded } from './embed.js'
import { initVectorStore, getStats, closeVectorStore } from './vectorstore.js'
import { retrieveContext } from './retrieve.js'
import { formatRagResponse } from './responder.js'
import { ingestDocument } from './ingest.js'
import type { RagHealth } from './types.js'

let _initialized = false

async function init(): Promise<void> {
  if (_initialized) return
  await initEmbedder()
  await initVectorStore()
  _initialized = true
}

function getHealth(): RagHealth {
  return {
    available: _initialized,
    modelLoaded: isModelLoaded(),
    vectorsCount: getStats().count,
    errors: 0,
  }
}

export const rag = {
  init,
  retrieve: retrieveContext,
  formatResponse: formatRagResponse,
  ingest: ingestDocument,
  getHealth,
  close: () => { closeVectorStore() },
}
