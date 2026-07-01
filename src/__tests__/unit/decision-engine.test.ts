import { describe, it, expect } from 'vitest'
import { decision } from '../../services/decision-engine.js'
import type { LeadInfo } from '../../services/decision-engine.js'

function makeLead(overrides?: Partial<LeadInfo>): LeadInfo {
  return {
    phone: '51999000111',
    name: undefined,
    dni: undefined,
    email: undefined,
    programInterest: undefined,
    score: 0,
    priority: undefined,
    dealStage: undefined,
    objections: undefined,
    urgency: undefined,
    tags: undefined,
    contactCount: 0,
    ...overrides,
  }
}

describe('decisionEngine — Regla 1: hasObjection', () => {
  it('si hay objeción → resolve_objection', () => {
    const r = decision.decide(makeLead(), 'cualquier mensaje', true)
    expect(r.type).toBe('resolve_objection')
    expect(r.reason).toContain('objeción')
  })
})

describe('decisionEngine — Regla 2: NO_INTERESADO', () => {
  it('dealStage = NO_INTERESADO → goodbye', () => {
    const r = decision.decide(makeLead({ dealStage: 'NO_INTERESADO' }), 'mensaje', false)
    expect(r.type).toBe('goodbye')
  })
})

describe('decisionEngine — Regla 3: PROPUESTA_ENVIADA o MATRICULADO', () => {
  it('dealStage = PROPUESTA_ENVIADA → handoff', () => {
    const r = decision.decide(makeLead({ dealStage: 'PROPUESTA_ENVIADA' }), 'mensaje', false)
    expect(r.type).toBe('handoff')
  })

  it('dealStage = MATRICULADO → handoff', () => {
    const r = decision.decide(makeLead({ dealStage: 'MATRICULADO' }), 'mensaje', false)
    expect(r.type).toBe('handoff')
  })
})

describe('decisionEngine — Regla 4: EN_NEGOCIACION + score >= 50', () => {
  it('dealStage = EN_NEGOCIACION, score 60 → handoff', () => {
    const r = decision.decide(makeLead({ dealStage: 'EN_NEGOCIACION', score: 60 }), 'mensaje', false)
    expect(r.type).toBe('handoff')
  })

  it('dealStage = EN_NEGOCIACION, score 30 → NO es handoff', () => {
    const r = decision.decide(makeLead({ dealStage: 'EN_NEGOCIACION', score: 30 }), 'mensaje', false)
    expect(r.type).not.toBe('handoff')
  })
})

describe('decisionEngine — Regla 5: INTERESADO + programInterest', () => {
  it('INTERESADO con programa → describe_program', () => {
    const r = decision.decide(makeLead({ dealStage: 'INTERESADO', programInterest: 'Ciencia de Datos' }), 'mensaje', false)
    expect(r.type).toBe('describe_program')
    expect(r.templateVars?.programa).toBe('Ciencia de Datos')
  })
})

describe('decisionEngine — Regla 6: INTERESADO sin programInterest', () => {
  it('INTERESADO sin programa → present_programs', () => {
    const r = decision.decide(makeLead({ dealStage: 'INTERESADO' }), 'mensaje', false)
    expect(r.type).toBe('present_programs')
  })
})

describe('decisionEngine — Regla 7: score >= 25 sin name', () => {
  it('score 30 sin nombre → ask_name', () => {
    const r = decision.decide(makeLead({ score: 30 }), 'mensaje', false)
    expect(r.type).toBe('ask_name')
  })
})

describe('decisionEngine — Regla 8: score >= 40 sin dni', () => {
  it('score 45 con nombre pero sin dni → ask_dni', () => {
    const r = decision.decide(makeLead({ score: 45, name: 'Juan' }), 'mensaje', false)
    expect(r.type).toBe('ask_dni')
  })
})

describe('decisionEngine — Regla 9: score >= 50 sin email', () => {
  it('score 55 con nombre y dni pero sin email → ask_email', () => {
    const r = decision.decide(makeLead({ score: 55, name: 'Juan', dni: '12345678' }), 'mensaje', false)
    expect(r.type).toBe('ask_email')
  })
})

describe('decisionEngine — Regla 10: urgencia INMEDIATA/ALTA', () => {
  it('urgencia INMEDIATA → handoff_urgent', () => {
    const r = decision.decide(makeLead({ urgency: 'INMEDIATA' }), 'mensaje', false)
    expect(r.type).toBe('handoff_urgent')
  })

  it('urgencia ALTA → handoff_urgent', () => {
    const r = decision.decide(makeLead({ urgency: 'ALTA' }), 'mensaje', false)
    expect(r.type).toBe('handoff_urgent')
  })
})

describe('decisionEngine — Regla 11: DEFAULT', () => {
  it('ninguna regla aplica → ask_more', () => {
    const r = decision.decide(makeLead(), 'hola', false)
    expect(r.type).toBe('ask_more')
  })
})

describe('decisionEngine — caso borde', () => {
  it('lead vacío con solo phone → ask_more', () => {
    const r = decision.decide({ phone: '51999000111' }, 'hola', false)
    expect(r.type).toBe('ask_more')
  })
})
