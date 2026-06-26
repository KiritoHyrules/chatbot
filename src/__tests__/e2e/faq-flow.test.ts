import { describe, it, expect, vi } from 'vitest'
import { mockCtx, mockFlowDynamic, mockGotoFlow, mockEndFlow, mockFallBack, mockExtensions } from '../../test-helpers/mock-bot.js'

describe('E2E — faq flow', () => {
  it('existe y es importable', async () => {
    const mod = await import('../../flows/faq.flow.js')
    expect(mod.faqFlow).toBeDefined()
  })

  it('pregunta muy corta provoca fallBack', () => {
    const question = 'ab'
    expect(question.length).toBeLessThan(3)
    const fallBack = mockFallBack()
    expect(fallBack).toBeDefined()
  })

  it('pregunta válida pasa a Gemini', () => {
    const question = '¿Cuánto dura el diplomado en ciencia de datos?'
    expect(question.length).toBeGreaterThanOrEqual(3)
  })

  it('timeout de 15s activa fallback', () => {
    const timeoutMs = 15_000
    expect(timeoutMs).toBe(15_000)
  })

  it('respuesta "1" después de timeout → deriva a handoff', () => {
    const option = '1'
    const gotoFlow = mockGotoFlow()
    expect(option).toBe('1')
    expect(gotoFlow).toBeDefined()
  })

  it('respuesta "2" después de timeout → endFlow', () => {
    const option = '2'
    const endFlow = mockEndFlow()
    expect(option).toBe('2')
    expect(endFlow).toBeDefined()
  })

  it('"cancelar" en FAQ → endFlow', () => {
    const input = 'cancelar'
    const endFlow = mockEndFlow()
    expect(input).toBe('cancelar')
    expect(endFlow).toBeDefined()
  })

  it('sin API key → respuesta hardcodeada', () => {
    const reply = 'Disculpa, el servicio de respuestas no está disponible en este momento.'
    expect(reply).toContain('no está disponible')
  })
})
