export type DecisionType =
  | 'welcome' | 'present_programs' | 'describe_program' | 'resolve_objection'
  | 'ask_name' | 'ask_dni' | 'ask_phone' | 'ask_email' | 'register_done'
  | 'handoff' | 'goodbye' | 'ask_more' | 'handoff_urgent'

export type Decision = {
  type: DecisionType
  reason: string
  templateVars?: Record<string, string>
}

export interface LeadInfo {
  phone: string
  name?: string
  dni?: string
  email?: string
  programInterest?: string
  score?: number
  priority?: string
  dealStage?: string
  objections?: string
  urgency?: string
  tags?: string
  contactCount?: number
}

export const decision = {
  decide(lead: LeadInfo, message: string, hasObjection: boolean): Decision {
    const msg = message.toLowerCase().trim()
    const stage = (lead.dealStage ?? '').toUpperCase()
    const urgency = (lead.urgency ?? '').toUpperCase()
    const score = lead.score ?? 0

    if (hasObjection) {
      return { type: 'resolve_objection', reason: 'El usuario presenta una objeción que debe ser resuelta.' }
    }

    if (stage === 'NO_INTERESADO') {
      return { type: 'goodbye', reason: 'El usuario ha rechazado explícitamente la oferta.' }
    }

    if (stage === 'PROPUESTA_ENVIADA' || stage === 'MATRICULADO') {
      return { type: 'handoff', reason: `El lead está en etapa ${stage}, requiere atención de asesor.` }
    }

    if (stage === 'EN_NEGOCIACION' && score >= 50) {
      return { type: 'handoff', reason: 'Lead en negociación con alta puntuación, derivar a asesor.' }
    }

    if (stage === 'INTERESADO' && lead.programInterest) {
      return {
        type: 'describe_program',
        reason: 'El lead está interesado en un programa específico.',
        templateVars: { programa: lead.programInterest },
      }
    }

    if (stage === 'INTERESADO' && !lead.programInterest) {
      return { type: 'present_programs', reason: 'Lead interesado pero sin programa definido.' }
    }

    if (score >= 25 && !lead.name) {
      return { type: 'ask_name', reason: 'Lead con puntaje suficiente pero sin nombre registrado.' }
    }

    if (score >= 40 && !lead.dni) {
      return { type: 'ask_dni', reason: 'Lead con puntaje alto pero sin DNI registrado.' }
    }

    if (score >= 50 && !lead.email) {
      return { type: 'ask_email', reason: 'Lead con puntaje alto pero sin email registrado.' }
    }

    if (urgency === 'INMEDIATA' || urgency === 'ALTA') {
      return { type: 'handoff_urgent', reason: `Urgencia detectada como ${urgency}, se requiere atención inmediata.` }
    }

    return { type: 'ask_more', reason: 'No aplican reglas anteriores, se pregunta si necesita algo más.' }
  },
}
