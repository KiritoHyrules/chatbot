import { classify } from './classifier.js'
import { leads, outbox } from './store.js'
import type { ClassificationResult } from './classifier.js'
import { normalizeLeadId } from './lead-id.js'

export const pipeline = {
  classifyAndSend(phone: string, message: string, context?: string) {
    const result: ClassificationResult = classify(message, context)

    const normalized = normalizeLeadId(phone)

    const lead = leads.upsert(normalized, {
      name: normalized,
      dni: '',
      phone: normalized,
      email: '',
      programInterest: null,
    })

    leads.updateClassification(lead.id, result.etapa_asignada, JSON.stringify(result))

    outbox.enqueue('lead.classified', {
      lead: {
        id: lead.id,
        phone: normalized,
        programInterest: lead.programInterest,
        status: lead.status,
        createdAt: lead.createdAt,
      },
      classification: result,
      source: { flow: 'mid-conversation', method: 'regex' },
    })
  },
}
