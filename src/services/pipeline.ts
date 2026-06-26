import { classify } from './classifier.js'
import { leads, outbox } from './store.js'
import type { ClassificationResult } from './classifier.js'

export const pipeline = {
  classifyAndSend(phone: string, message: string, context?: string) {
    const result: ClassificationResult = classify(message, context)

    const cleanPhone = phone.includes('@') ? phone.split('@')[0] : phone

    const lead = leads.upsert(cleanPhone, {
      name: cleanPhone,
      dni: '',
      phone: cleanPhone,
      email: '',
      programInterest: null,
    })

    leads.updateClassification(lead.id, result.etapa_asignada, JSON.stringify(result))

    outbox.enqueue('lead.classified', {
      lead: {
        id: lead.id,
        phone: cleanPhone,
        programInterest: lead.programInterest,
        status: lead.status,
        createdAt: lead.createdAt,
      },
      classification: result,
      source: { flow: 'mid-conversation', method: 'regex' },
    })
  },
}
