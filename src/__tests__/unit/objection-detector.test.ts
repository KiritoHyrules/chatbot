import { describe, it, expect } from 'vitest'
import { objectionDetector } from '../../services/objection-detector.js'

describe('objectionDetector', () => {
  it('detecta objeción de precio', () => {
    const r = objectionDetector.detect('Está muy caro para mí')
    expect(r).not.toBeNull()
    expect(r!.type).toBe('precio')
    expect(['ALTA', 'MEDIA']).toContain(r!.confidence)
    expect(r!.counter.length).toBeGreaterThan(10)
  })

  it('detecta objeción de tiempo', () => {
    const r = objectionDetector.detect('No tengo tiempo para estudiar')
    expect(r).not.toBeNull()
    expect(r!.type).toBe('tiempo')
  })

  it('detecta objeción de confianza', () => {
    const r = objectionDetector.detect('Es confiable el CEE?')
    expect(r).not.toBeNull()
    expect(r!.type).toBe('confianza')
  })

  it('detecta objeción de competencia', () => {
    const r = objectionDetector.detect('En otro lugar es más barato')
    expect(r).not.toBeNull()
    expect(r!.type).toBe('competencia')
  })

  it('detecta objeción de calidad', () => {
    const r = objectionDetector.detect('Vale la pena el curso?')
    expect(r).not.toBeNull()
    expect(r!.type).toBe('calidad')
  })

  it('detecta objeción de compromiso', () => {
    const r = objectionDetector.detect('Lo voy a pensar')
    expect(r).not.toBeNull()
    expect(r!.type).toBe('compromiso')
  })

  it('mensaje sin objeción → null', () => {
    const r = objectionDetector.detect('Quiero inscribirme al diplomado')
    expect(r).toBeNull()
  })

  it('múltiples patrones → confidence ALTA', () => {
    const r = objectionDetector.detect('Está muy caro, no me alcanza el presupuesto, excede lo que puedo pagar')
    expect(r).not.toBeNull()
    expect(r!.type).toBe('precio')
    expect(r!.confidence).toBe('ALTA')
  })
})
