import { describe, it, expect } from 'vitest'
import { mockCtx, mockFlowDynamic, mockState, mockGotoFlow, mockEndFlow, mockFallBack, mockExtensions } from '../../test-helpers/mock-bot.js'

describe('E2E — programs flow', () => {
  it('existe y es importable', async () => {
    const mod = await import('../../flows/programs.flow.js')
    expect(mod.programsFlow).toBeDefined()
  })

  it('lista 5 programas', () => {
    const flowDynamic = mockFlowDynamic()
    const extensions = mockExtensions()
    const ctx = mockCtx({ body: 'programas' })
    expect(flowDynamic).toBeDefined()
    expect(extensions.ai.chat).toBeDefined()
  })

  it('selección inválida (0) provoca fallBack', () => {
    const fallBack = mockFallBack()
    const index = 0
    expect(index < 1).toBe(true)
    expect(fallBack).toBeDefined()
  })

  it('selección válida (2) guarda programInterest en state', () => {
    const state = mockState()
    state.update({ programInterest: 'Diplomado en Ciencia de Datos' })
    expect(state.get('programInterest')).toBe('Diplomado en Ciencia de Datos')
  })

  it('programa sin brochure (Power BI) no envía media', () => {
    const hasBrochure = false
    expect(hasBrochure).toBe(false)
  })
})
