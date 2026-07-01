export interface Chunk {
  id: string
  content: string
  metadata: Record<string, unknown>
  chunkIndex: number
}

export interface RetrievedChunk {
  content: string
  similarity: number
  metadata: Record<string, unknown>
}

export interface RagOptions {
  topK?: number
  threshold?: number
}

export interface RagHealth {
  available: boolean
  modelLoaded: boolean
  vectorsCount: number
  errors: number
}
