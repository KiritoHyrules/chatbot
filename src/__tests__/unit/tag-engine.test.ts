import { describe, it, expect } from 'vitest'
import { tagEngine } from '../../services/tag-engine.js'

describe('tagEngine', () => {
  it('"quiero inscribirme" → potencial', () => {
    expect(tagEngine.tag('Quiero inscribirme ahora')).toContain('potencial')
  })

  it('"beca" → beca', () => {
    expect(tagEngine.tag('Hay alguna beca disponible?')).toContain('beca')
  })

  it('"para mi empresa" → empresarial', () => {
    expect(tagEngine.tag('Para mi empresa')).toContain('empresarial')
  })

  it('"urgente" → urgente', () => {
    expect(tagEngine.tag('Es urgente por favor')).toContain('urgente')
  })

  it('"no sé" → indeciso', () => {
    expect(tagEngine.tag('No sé si me alcanzará')).toContain('indeciso')
  })

  it('"me recomendaron" → referido', () => {
    expect(tagEngine.tag('Me recomendaron el curso')).toContain('referido')
  })

  it('"gerente" → corporativo', () => {
    expect(tagEngine.tag('Soy gerente de una empresa')).toContain('corporativo')
  })

  it('"UNI" → alumno_uni', () => {
    expect(tagEngine.tag('Soy de la UNI')).toContain('alumno_uni')
  })

  it('mensaje sin coincidencias → array vacío', () => {
    expect(tagEngine.tag('Hola cómo estás')).toEqual([])
  })

  it('múltiples tags: urgente + potencial + alumno_uni', () => {
    const tags = tagEngine.tag('Soy alumno UNI y quiero inscribirme urgente')
    expect(tags).toContain('alumno_uni')
    expect(tags).toContain('potencial')
    expect(tags).toContain('urgente')
  })
})
