import { describe, it, expect } from 'vitest'
import { programs } from '../../data/programs.js'

describe('programs data', () => {
  it('tiene exactamente 5 programas', () => {
    expect(programs).toHaveLength(5)
  })

  it('todos los ids son únicos', () => {
    const ids = programs.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('todos tienen nombre no vacío', () => {
    for (const p of programs) {
      expect(p.name).toBeTruthy()
      expect(p.name.length).toBeGreaterThan(0)
    }
  })

  it('todos tienen tipo válido', () => {
    const validTypes = ['Diplomado', 'PEE', 'Curso', 'In-House']
    for (const p of programs) {
      expect(validTypes).toContain(p.type)
    }
  })

  it('Power BI (programs[4]) no tiene brochure', () => {
    expect(programs[4].brochureFile).toBeNull()
  })

  it('los primeros 4 programas tienen brochure', () => {
    for (let i = 0; i < 4; i++) {
      expect(programs[i].brochureFile).toBeTruthy()
      expect(programs[i].brochureFile).not.toBeNull()
    }
  })
})
