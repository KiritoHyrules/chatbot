import { describe, it, expect } from 'vitest'
import { urgencyDetector } from '../../services/urgency-detector.js'

describe('urgencyDetector', () => {
  it('"urgente" → INMEDIATA', () => {
    expect(urgencyDetector.assess('Esto es urgente')).toBe('INMEDIATA')
  })

  it('"lo antes posible" → INMEDIATA', () => {
    expect(urgencyDetector.assess('Lo antes posible')).toBe('INMEDIATA')
  })

  it('"esta semana" → ALTA', () => {
    expect(urgencyDetector.assess('Lo necesito esta semana')).toBe('ALTA')
  })

  it('"pronto" → ALTA', () => {
    expect(urgencyDetector.assess('Quiero info pronto')).toBe('ALTA')
  })

  it('"este mes" → MEDIA', () => {
    expect(urgencyDetector.assess('Quiero empezar este mes')).toBe('MEDIA')
  })

  it('"más adelante" → BAJA', () => {
    expect(urgencyDetector.assess('Lo veré más adelante')).toBe('BAJA')
  })

  it('mensaje sin urgencia → NINGUNA', () => {
    expect(urgencyDetector.assess('Hola, buenos días')).toBe('NINGUNA')
  })

  it('"ahora mismo" → INMEDIATA (caso borde)', () => {
    expect(urgencyDetector.assess('Necesito ayuda ahora mismo')).toBe('INMEDIATA')
  })
})
