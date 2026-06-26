import { describe, it, expect } from 'vitest'
import { leadScorer } from '../../services/lead-scorer.js'

describe('leadScorer', () => {
  it('"cuánto cuesta" → +10, MEDIA', () => {
    const r = leadScorer.score('¿Cuánto cuesta el diplomado?')
    expect(r.actions).toContain('pregunta precio / costo')
    expect(r.score).toBe(10)
    expect(r.priority).toBe('MEDIA')
  })

  it('"pásame el link de pago" → +30, ALTA', () => {
    const r = leadScorer.score('Pásame el link de pago')
    expect(r.actions).toContain('pide link de pago')
    expect(r.score).toBe(30)
    expect(r.priority).toBe('ALTA')
  })

  it('"comparto mi DNI" → +25, MEDIA', () => {
    const r = leadScorer.score('Te comparto mi DNI: 12345678')
    expect(r.actions).toContain('compartió DNI')
    expect(r.score).toBe(25)
    expect(r.priority).toBe('MEDIA')
  })

  it('"ya pagué, aquí el comprobante" → +35 +15 por "ya" = 50, ALTA', () => {
    const r = leadScorer.score('Ya pagué, aquí está el comprobante')
    expect(r.actions).toContain('confirmó pago / adjuntó comprobante')
    expect(r.score).toBe(50)
    expect(r.priority).toBe('ALTA')
  })

  it('"no gracias, no me interesa" → -50 -40 = -90, BAJA', () => {
    const r = leadScorer.score('No gracias, no me interesa')
    expect(r.actions).toContain('dice que no le interesa')
    expect(r.score).toBe(-90)
    expect(r.priority).toBe('BAJA')
  })

  it('"hola" → 0, MEDIA', () => {
    const r = leadScorer.score('Hola')
    expect(r.actions).toContain('mensaje genérico / no claro')
    expect(r.score).toBe(0)
    expect(r.priority).toBe('MEDIA')
  })

  it('"quiero ser contactado" → +20, MEDIA', () => {
    const r = leadScorer.score('Quiero ser contactado por un asesor')
    expect(r.actions).toContain('quiere ser contactado')
    expect(r.score).toBe(20)
    expect(r.priority).toBe('MEDIA')
  })

  it('"es muy caro" → -20, BAJA', () => {
    const r = leadScorer.score('Está muy caro para mí')
    expect(r.actions).toContain('dice que es muy caro')
    expect(r.score).toBe(-20)
    expect(r.priority).toBe('BAJA')
  })

  it('combinación: link de pago + DNI → 30+25=55, URGENTE', () => {
    const r = leadScorer.score('Pásame el link de pago, te comparto mi DNI')
    expect(r.actions.length).toBeGreaterThanOrEqual(2)
    expect(r.score).toBe(55)
    expect(r.priority).toBe('ALTA')
  })

  it('"necesito info del programa" → +15, MEDIA', () => {
    const r = leadScorer.score('Necesito información del programa')
    expect(r.actions).toContain('pide información de programa')
    expect(r.score).toBe(15)
    expect(r.priority).toBe('MEDIA')
  })

  it('"agendar cita" → +25, MEDIA', () => {
    const r = leadScorer.score('Quiero agendar una cita')
    expect(r.actions).toContain('pide llamada / agendar cita')
    expect(r.score).toBe(25)
    expect(r.priority).toBe('MEDIA')
  })

  it('"urgente, necesito hoy" → +15 por urgencia', () => {
    const r = leadScorer.score('Es urgente, necesito información hoy')
    expect(r.actions).toContain('menciona urgencia (hoy, ya, rápido)')
    expect(r.score).toBe(15)
    expect(r.priority).toBe('MEDIA')
  })
})
