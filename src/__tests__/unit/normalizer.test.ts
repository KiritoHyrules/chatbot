import { describe, it, expect } from 'vitest'
import { normalizeQuery } from '../../services/normalizer.js'

describe('normalizeQuery', () => {
  it('tildes se eliminan', () => {
    expect(normalizeQuery('información')).toBe('informacion')
  })

  it('signos se eliminan', () => {
    expect(normalizeQuery('¿cuánto cuesta?')).toBe('cuanto cuesta')
  })

  it('xq se expande a porque', () => {
    expect(normalizeQuery('xq no me dicen')).toBe('porque no me dicen')
  })

  it('tbn se expande a tambien', () => {
    expect(normalizeQuery('tbn quiero info del MBA')).toBe('tambien quiero info del mba')
  })

  it('kuanto se normaliza a cuanto', () => {
    expect(normalizeQuery('kuanto kuesta el diplomado')).toBe('cuanto cuesta el diplomado')
  })

  it('espacios múltiples se colapsan', () => {
    expect(normalizeQuery('hola    mundo   cruel')).toBe('hola mundo cruel')
  })

  it('q se expande a que', () => {
    expect(normalizeQuery('q programa me recomiendas')).toBe('que programa me recomiendas')
  })
})
