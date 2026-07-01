import { describe, it, expect } from 'vitest'
import { extractNumber, resolveReference } from '../../services/number-extractor.js'

describe('extractNumber — referencias', () => {
  it('"el primero" → 1', () => {
    expect(extractNumber('el primero')).toBe(1)
  })

  it('"la segunda" → 2', () => {
    expect(extractNumber('la segunda')).toBe(2)
  })

  it('"tercero" → 3', () => {
    expect(extractNumber('tercero')).toBe(3)
  })

  it('"cuarto" → 4', () => {
    expect(extractNumber('cuarto')).toBe(4)
  })

  it('"quinto" → 5', () => {
    expect(extractNumber('quinto')).toBe(5)
  })

  it('"ese" → null (sin contexto no resuelve)', () => {
    expect(extractNumber('ese')).toBeNull()
  })

  it('"el que dijiste" → null (sin contexto)', () => {
    expect(extractNumber('el que dijiste')).toBeNull()
  })

  it('"el de operaciones" → null (sin contexto)', () => {
    expect(extractNumber('el de operaciones')).toBeNull()
  })
})

describe('resolveReference', () => {
  const programs = [
    'Diplomado en Gestión de Proyectos',
    'Diplomado en Ciencia de Datos',
    'PEE en Transformación Digital',
    'PEE en Ciberseguridad',
    'Curso Taller de Power BI',
  ]

  it('"ese" con último programa → devuelve su índice + 1', () => {
    expect(resolveReference('ese', programs, 'PEE en Ciberseguridad')).toBe(4)
  })

  it('"esa" con último programa → devuelve su índice + 1', () => {
    expect(resolveReference('esa', programs, 'Diplomado en Ciencia de Datos')).toBe(2)
  })

  it('"el que dijiste" con último programa → devuelve su índice + 1', () => {
    expect(resolveReference('el que dijiste', programs, 'PEE en Transformación Digital')).toBe(3)
  })

  it('"el de ciberseguridad" → busca por palabra clave', () => {
    expect(resolveReference('el de ciberseguridad', programs)).toBe(4)
  })

  it('"el de power bi" → busca por palabra clave', () => {
    expect(resolveReference('el de power bi', programs)).toBe(5)
  })

  it('"el de datos" → busca por palabra clave', () => {
    expect(resolveReference('el de datos', programs)).toBe(2)
  })

  it('sin último programa "ese" → null', () => {
    expect(resolveReference('ese', programs, undefined)).toBeNull()
  })

  it('sin match → null', () => {
    expect(resolveReference('no sé cuál', programs, 'PEE en Ciberseguridad')).toBeNull()
  })
})
