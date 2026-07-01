import { describe, it, expect } from 'vitest'
import { classify } from '../../services/classifier.js'
import type { DealStage, ClassificationResult } from '../../services/classifier.js'
import { classifierMessages } from '../../test-helpers/fixtures.js'

function assertStage(result: ClassificationResult, expectedStage: DealStage, expectedConfidence: 'ALTA' | 'MEDIA' | 'BAJA') {
  expect(result.etapa_asignada).toBe(expectedStage)
  expect(result.confianza_analisis).toBe(expectedConfidence)
  expect(result.justificacion_corta).toBeTruthy()
  expect(typeof result.justificacion_corta).toBe('string')
  expect(result.justificacion_corta.length).toBeGreaterThan(5)
}

describe('classifier — MATRICULADO', () => {
  it('"Ya pagué, aquí está el comprobante"', () => assertStage(classify('Ya pagué, aquí está el comprobante'), 'MATRICULADO', 'ALTA'))
  it('"Listo, ya transferí, te mando el voucher"', () => assertStage(classify('Listo, ya transferí, te mando el voucher'), 'MATRICULADO', 'ALTA'))
  it('"Aquí te envío la captura del pago"', () => assertStage(classify(classifierMessages.matriculado_3), 'MATRICULADO', 'ALTA'))
  it('"Ya hice el depósito, adjunto comprobante"', () => assertStage(classify('Ya hice el depósito, adjunto comprobante'), 'MATRICULADO', 'ALTA'))
  it('"Acabo de yapear, aquí está el voucher"', () => assertStage(classify(classifierMessages.matriculado_5), 'MATRICULADO', 'ALTA'))
})

describe('classifier — PROPUESTA_ENVIADA', () => {
  it('"Pásame el link de pago"', () => assertStage(classify(classifierMessages.propuesta_1), 'PROPUESTA_ENVIADA', 'ALTA'))
  it('"¿A qué cuenta bancaria puedo depositar?"', () => assertStage(classify(classifierMessages.propuesta_2), 'PROPUESTA_ENVIADA', 'ALTA'))
  it('"Envíame el formato de matrícula"', () => assertStage(classify(classifierMessages.propuesta_3), 'PROPUESTA_ENVIADA', 'ALTA'))
  it('"¿Cómo puedo pagar?"', () => assertStage(classify(classifierMessages.propuesta_4), 'PROPUESTA_ENVIADA', 'ALTA'))
  it('"Dame el número de cuenta para transferir"', () => assertStage(classify(classifierMessages.propuesta_5), 'PROPUESTA_ENVIADA', 'ALTA'))
})

describe('classifier — EN_NEGOCIACION', () => {
  it('"¿Me pueden llamar a las 5pm?"', () => assertStage(classify(classifierMessages.negociacion_1), 'EN_NEGOCIACION', 'ALTA'))
  it('"Quiero agendar una entrevista"', () => assertStage(classify(classifierMessages.negociacion_2), 'EN_NEGOCIACION', 'ALTA'))
  it('"¿Tienen opción de pagar en cuotas?"', () => assertStage(classify(classifierMessages.negociacion_3), 'EN_NEGOCIACION', 'ALTA'))
  it('"¿Hay descuento por grupo?"', () => assertStage(classify(classifierMessages.negociacion_4), 'EN_NEGOCIACION', 'ALTA'))
  it('"Necesito validar si cumplo los requisitos"', () => assertStage(classify(classifierMessages.negociacion_5), 'EN_NEGOCIACION', 'ALTA'))
})

describe('classifier — NO_INTERESADO', () => {
  it('"No gracias, no me interesa"', () => assertStage(classify(classifierMessages.no_interesado_1), 'NO_INTERESADO', 'ALTA'))
  it('"Está muy caro, no puedo pagar"', () => assertStage(classify(classifierMessages.no_interesado_2), 'NO_INTERESADO', 'ALTA'))
  it('"No me alcanza el presupuesto"', () => assertStage(classify(classifierMessages.no_interesado_3), 'NO_INTERESADO', 'ALTA'))
  it('"Bórrenme de la lista"', () => assertStage(classify(classifierMessages.no_interesado_4), 'NO_INTERESADO', 'ALTA'))
  it('"Ya me matriculé en otra universidad"', () => assertStage(classify(classifierMessages.no_interesado_5), 'NO_INTERESADO', 'ALTA'))
})

describe('classifier — INTERESADO', () => {
  it('"Me interesa el diplomado en ciencia de datos"', () => assertStage(classify(classifierMessages.interesado_1), 'INTERESADO', 'ALTA'))
  it('"¿Cuánto cuesta el curso de Power BI?"', () => assertStage(classify(classifierMessages.interesado_2), 'INTERESADO', 'ALTA'))
  it('"Quiero más información del programa"', () => assertStage(classify(classifierMessages.interesado_3), 'INTERESADO', 'ALTA'))
  it('"¿Qué horarios tienen?"', () => assertStage(classify(classifierMessages.interesado_4), 'INTERESADO', 'ALTA'))
  it('"Envíame el temario del diplomado"', () => assertStage(classify(classifierMessages.interesado_5), 'INTERESADO', 'ALTA'))
})

describe('classifier — NEUTRO_O_DUDOSO', () => {
  it('"Hola"', () => assertStage(classify(classifierMessages.neutro_1), 'NEUTRO_O_DUDOSO', 'ALTA'))
  it('"Buenas tardes"', () => assertStage(classify(classifierMessages.neutro_2), 'NEUTRO_O_DUDOSO', 'ALTA'))
  it('"Ok"', () => assertStage(classify(classifierMessages.neutro_3), 'NEUTRO_O_DUDOSO', 'ALTA'))
  it('"👍"', () => assertStage(classify(classifierMessages.neutro_4), 'NEUTRO_O_DUDOSO', 'ALTA'))
  it('"Gracias"', () => assertStage(classify(classifierMessages.neutro_5), 'NEUTRO_O_DUDOSO', 'ALTA'))
})

describe('classifier — precedencia de reglas', () => {
  it('"Ya pagué, pásame el link para el comprobante" → MATRICULADO gana', () => {
    const result = classify('Ya pagué, pásame el link para el comprobante')
    expect(result.etapa_asignada).toBe('MATRICULADO')
  })

  it('"No me interesa, ya pagué en otro lado" → NO_INTERESADO gana (regex más estricto)', () => {
    const result = classify('No me interesa, ya pagué en otro lado')
    expect(result.etapa_asignada).toBe('NO_INTERESADO')
  })

  it('"Quiero info del curso pero está muy caro" → NO_INTERESADO gana (rechazo explícito por precio)', () => {
    const result = classify('Quiero info del curso pero está muy caro')
    expect(result.etapa_asignada).toBe('NO_INTERESADO')
  })
})

describe('classifier — fallback con contexto', () => {
  it('mensaje vago + contexto de interés → INTERESADO (MEDIA)', () => {
    const result = classify('Está bien', 'Lead capturado: Juan. Interesado en Ciencia de Datos.')
    expect(result.etapa_asignada).toBe('INTERESADO')
    expect(result.confianza_analisis).toBe('MEDIA')
  })

  it('mensaje vago sin contexto → NEUTRO_O_DUDOSO (BAJA)', () => {
    const result = classify('Está bien')
    expect(result.etapa_asignada).toBe('NEUTRO_O_DUDOSO')
    expect(result.confianza_analisis).toBe('BAJA')
  })

  it('contexto largo sin palabras clave de interés → INTERESADO por fallback', () => {
    const result = classify('mmm...', 'Usuario preguntó por precios y horarios de 3 programas diferentes del CEE.')
    expect(result.etapa_asignada).toBe('INTERESADO')
    expect(result.confianza_analisis).toBe('MEDIA')
  })
})

describe('classifier — casos límite', () => {
  it('string vacío → NEUTRO_O_DUDOSO', () => {
    const result = classify('')
    expect(result.etapa_asignada).toBe('NEUTRO_O_DUDOSO')
  })

  it('mensaje de 500 caracteres con "me interesa" detecta INTERESADO', () => {
    const longMsg = 'x'.repeat(480) + ' me interesa el curso de ciencia de datos'
    const result = classify(longMsg)
    expect(result.etapa_asignada).toBe('INTERESADO')
  })

  it('espacios alrededor no afectan detección', () => {
    const result = classify('   hola   ')
    expect(result.etapa_asignada).toBe('NEUTRO_O_DUDOSO')
  })

  it('emojis sin texto → NEUTRO_O_DUDOSO', () => {
    const result = classify('🎉🎊✨')
    expect(result.etapa_asignada).toBe('NEUTRO_O_DUDOSO')
  })
})

describe('classifier — justificación', () => {
  it('la justificación incluye preview del mensaje', () => {
    const result = classify('Me interesa el diplomado en gestión de proyectos')
    expect(result.justificacion_corta).toContain('Me interesa el diplomado')
  })

  it('mensajes largos se truncan en la justificación', () => {
    const longMsg = 'x'.repeat(200) + ' me interesa'
    const result = classify(longMsg)
    expect(result.justificacion_corta.length).toBeLessThan(longMsg.length + 30)
  })

  it('todas las etapas tienen justificación', () => {
    const stages: DealStage[] = ['INTERESADO', 'EN_NEGOCIACION', 'PROPUESTA_ENVIADA', 'MATRICULADO', 'NO_INTERESADO', 'NEUTRO_O_DUDOSO']
    for (const stage of stages) {
      const result = classify('test para ' + stage, stage === 'NEUTRO_O_DUDOSO' ? undefined : 'Lead interesado en programa')
      expect(result.justificacion_corta.length).toBeGreaterThan(5)
    }
  })
})

describe('classifier — abreviaciones peruanas', () => {
  it('"kuanto kuesta xfa" → INTERESADO (post-normalización)', () => {
    assertStage(classify('kuanto kuesta xfa'), 'INTERESADO', 'ALTA')
  })

  it('"tbn quiero info del diplomado" → NEUTRO (la normalización expande pero falta detalle)', () => {
    const result = classify('tbn quiero info del diplomado')
    expect(result.etapa_asignada).toBe('NEUTRO_O_DUDOSO')
  })

  it('"q programa me recomiendas" → NEUTRO (sin palabra clave fuerte)', () => {
    const result = classify('q programa me recomiendas')
    expect(result.etapa_asignada).toBe('NEUTRO_O_DUDOSO')
  })
})

describe('classifier — clasificación contradictoria', () => {
  it('"no me interesa pero igual llamame" → NO_INTERESADO (el orden de reglas prioriza el rechazo)', () => {
    const result = classify('no me interesa pero igual llamame')
    expect(result.etapa_asignada).toBe('NO_INTERESADO')
  })
})
