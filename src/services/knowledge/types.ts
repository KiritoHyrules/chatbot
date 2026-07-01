export interface KnowledgeAnswer {
  text: string
  source: 'static' | 'vector' | 'llm'
  confidence: number
  citations?: Array<{ doc: string; chunk: string }>
}

export interface KnowledgeSource {
  findAnswer(query: string, programContext?: string | null): Promise<KnowledgeAnswer | null>
}
