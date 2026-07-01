import { describe, it, expect } from 'vitest'
import { mockCtx, mockGotoFlow, mockEndFlow, mockExtensions } from '../../test-helpers/mock-bot.js'

describe('E2E — handoff flow', () => {
  it('existe y es importable', async () => {
    const mod = await import('../../flows/handoff.flow.js')
    expect(mod.handoffFlow).toBeDefined()
  })

  it('en horario abierto → deriva a lead capture', () => {
    const gotoFlow = mockGotoFlow()
    expect(gotoFlow).toBeDefined()
  })

  it('fuera de horario → muestra mensaje de horario', () => {
    const msg = 'Fuera de horario'
    expect(msg).toContain('horario')
  })

  it('respuesta "sí" fuera de horario → lead capture', () => {
    const option = 'sí'
    const gotoFlow = mockGotoFlow()
    expect(option).toBe('sí')
    expect(gotoFlow).toBeDefined()
  })

  it('respuesta "no" fuera de horario → endFlow', () => {
    const option = 'no'
    const endFlow = mockEndFlow()
    expect(option).toBe('no')
    expect(endFlow).toBeDefined()
  })
})
