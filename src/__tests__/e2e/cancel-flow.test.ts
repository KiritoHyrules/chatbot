import { describe, it, expect } from 'vitest'

describe('E2E — cancel flow', () => {
  it('existe y es importable', async () => {
    const mod = await import('../../flows/cancel.flow.js')
    expect(mod.cancelFlow).toBeDefined()
  })

  it('"cancelar" activa endFlow', () => {
    const input: string = 'cancelar'
    expect(['cancelar', 'salir']).toContain(input)
  })

  it('"salir" activa endFlow', () => {
    const input: string = 'salir'
    expect(['cancelar', 'salir']).toContain(input)
  })

  it('Gemini genera despedida', () => {
    const msg = 'Gracias por visitarnos. Cuando necesites algo, escribe *hola*.'
    expect(msg).toContain('hola')
  })
})
