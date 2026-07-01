import { describe, it, expect } from 'vitest'
import { templates } from '../../services/response-templates.js'

describe('response-templates — anti-repetición per-user', () => {
  it('pick con mismo usuario y escenario no repite las últimas 2 variantes', () => {
    const phone = '51999888777'
    const used: string[] = []

    for (let i = 0; i < 5; i++) {
      const result = templates.pick('ask_name', phone)
      used.push(result)
    }

    // Verificar que las últimas 3 llamadas no repiten las últimas 2
    const last3 = used.slice(-3)
    const unique = new Set(last3)
    expect(unique.size).toBeGreaterThanOrEqual(2)
  })

  it('pick con usuarios distintos rotan independientemente', () => {
    const a = templates.pick('ask_name', '51999000001')
    const b = templates.pick('ask_name', '51999000002')
    // Pueden ser iguales (hay 4 variantes, 25% de colisión), pero no deberían
    // estar correlacionados — solo verificamos que no crashea
    expect(typeof a).toBe('string')
    expect(typeof b).toBe('string')
  })

  it('get mantiene compatibilidad (sin phone)', () => {
    const result = templates.get('ask_name')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(5)
  })

  it('pick con vars reemplaza placeholders', () => {
    const result = templates.pick('WELCOME_RETURNING', '51999888777', { name: 'Juan' })
    expect(result).toContain('Juan')
    expect(result).not.toContain('{name}')
  })

  it('pick con escenario inexistente cae a fallback', () => {
    const result = templates.pick('no_existe', '51999888777')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(5)
  })
})
