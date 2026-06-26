import { describe, it, expect } from 'vitest'
import { rnd } from '../../utils.js'

describe('rnd()', () => {
  it('devuelve un número entre 500 y 1300 inclusive', () => {
    for (let i = 0; i < 100; i++) {
      const result = rnd()
      expect(result).toBeGreaterThanOrEqual(500)
      expect(result).toBeLessThanOrEqual(1300)
    }
  })

  it('devuelve un número entero', () => {
    for (let i = 0; i < 50; i++) {
      expect(Number.isInteger(rnd())).toBe(true)
    }
  })

  it('no devuelve siempre el mismo valor', () => {
    const results = new Set<number>()
    for (let i = 0; i < 100; i++) {
      results.add(rnd())
    }
    expect(results.size).toBeGreaterThan(1)
  })
})
