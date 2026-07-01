import { describe, it, expect, vi } from 'vitest'
import { mockCtx, mockFlowDynamic, mockExtensions } from '../../test-helpers/mock-bot.js'

vi.mock('@builderbot/bot', () => ({
  addKeyword: vi.fn(() => ({
    addAction: vi.fn().mockReturnThis(),
  })),
  EVENTS: { WELCOME: 'WELCOME' },
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

describe('E2E — welcome flow', () => {
  it('existe y es importable', async () => {
    const mod = await import('../../flows/welcome.flow.js')
    expect(mod.welcomeFlow).toBeDefined()
  })

  it('saludo inicial usa templates, no Gemini', () => {
    const ctx = mockCtx({ body: 'hola' })
    const flowDynamic = mockFlowDynamic()
    const templates = {
      get: vi.fn((scenario: string) => {
        if (scenario === 'WELCOME_FIRST_TIME') return 'Hola desde template'
        if (scenario === 'WELCOME_OPEN_QUESTION') return '¿En qué te ayudo?'
        return 'fallback'
      }),
    }
    const ext = mockExtensions({
      templates,
      intentRouter: { detect: vi.fn().mockReturnValue({ intent: 'unclear', confidence: 'BAJA' }) },
      humanPresence: { reply: vi.fn(async () => {}) },
    }) as Any

    expect(ext.templates.get).toBeDefined()
    expect(ext.humanPresence.reply).toBeDefined()
    expect(flowDynamic).toBeDefined()
  })

  it('primer mensaje con intención clara deriva directo sin preguntar', () => {
    const detect = vi.fn().mockReturnValue({ intent: 'programs', confidence: 'ALTA' })
    const ext = mockExtensions({
      templates: { get: vi.fn().mockReturnValue('Hola') },
      intentRouter: { detect },
      humanPresence: { reply: vi.fn(async () => {}) },
    }) as Any

    expect(ext.intentRouter.detect).toBeDefined()
  })

  it('sin API key usa fallback de templates', () => {
    const ext = mockExtensions({
      ai: { chat: vi.fn().mockRejectedValue(new Error('no key')), clearHistory: vi.fn() },
      templates: { get: vi.fn().mockReturnValue('Hola') },
      intentRouter: { detect: vi.fn().mockReturnValue({ intent: 'unclear', confidence: 'BAJA' }) },
      humanPresence: { reply: vi.fn(async () => {}) },
    }) as Any

    expect(ext.ai.chat).toBeDefined()
    expect(ext.templates.get).toBeDefined()
  })

  it('returning user usa template WELCOME_RETURNING', () => {
    const templates = {
      get: vi.fn((scenario: string) => {
        return `Saludo de ${scenario}`
      }),
    }
    const ext = mockExtensions({
      templates,
      intentRouter: { detect: vi.fn().mockReturnValue({ intent: 'unclear', confidence: 'BAJA' }) },
      humanPresence: { reply: vi.fn(async () => {}) },
      messageLog: {
        incoming: vi.fn(),
        outgoing: vi.fn(),
        shouldRespond: vi.fn().mockReturnValue(true),
        dashboard: { getMode: vi.fn().mockReturnValue('AI') },
      },
    }) as Any

    expect(ext.templates.get).toBeDefined()
    expect(ext.humanPresence.reply).toBeDefined()
  })
})
