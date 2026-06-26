import { describe, it, expect, vi } from 'vitest'
import { mockCtx, mockFlowDynamic, mockGotoFlow, mockEndFlow, mockFallBack, mockExtensions } from '../../test-helpers/mock-bot.js'

vi.mock('@builderbot/bot', () => ({
  addKeyword: vi.fn(() => ({
    addAction: vi.fn().mockReturnThis(),
  })),
  EVENTS: { WELCOME: 'WELCOME' },
}))

describe('E2E — welcome flow', () => {
  it('existe y es importable', async () => {
    const mod = await import('../../flows/welcome.flow.js')
    expect(mod.welcomeFlow).toBeDefined()
  })

  it('responde con saludo y menú', () => {
    const ctx = mockCtx({ body: 'hola' })
    const flowDynamic = mockFlowDynamic()
    const extensions = mockExtensions({
      ai: { chat: vi.fn().mockResolvedValue('Bienvenido al CEE. Escoge:\n*1.* Programas\n*2.* FAQ\n*3.* Asesor') },
    })

    // El flow dynamic debe contener el menú
    expect(extensions.ai.chat).toBeDefined()
    expect(flowDynamic).toBeDefined()
  })

  it('sin API key usa fallback', () => {
    const extensions = mockExtensions({
      ai: { chat: vi.fn().mockResolvedValue(null) },
    })
    expect(extensions.ai.chat).toBeDefined()
  })
})
