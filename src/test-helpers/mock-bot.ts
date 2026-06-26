import { vi } from 'vitest'

export function mockCtx(overrides: Record<string, unknown> = {}) {
  return {
    from: '51987654321@s.whatsapp.net',
    name: 'Test User',
    body: '',
    ...overrides,
  }
}

export function mockFlowDynamic() {
  return vi.fn().mockResolvedValue(undefined)
}

export function mockState() {
  const store: Record<string, unknown> = {}
  return {
    get: vi.fn(<T>(key: string) => store[key] as T | undefined),
    update: vi.fn(async (data: Record<string, unknown>) => {
      Object.assign(store, data)
    }),
  }
}

export function mockGotoFlow() {
  return vi.fn()
}

export function mockEndFlow() {
  return vi.fn()
}

export function mockFallBack() {
  return vi.fn()
}

export function mockExtensions(overrides: Record<string, unknown> = {}) {
  return {
    ai: {
      chat: vi.fn().mockResolvedValue('Respuesta de prueba'),
      clearHistory: vi.fn(),
    },
    messageLog: {
      incoming: vi.fn(),
      outgoing: vi.fn(),
      shouldRespond: vi.fn().mockReturnValue(true),
    },
    ...overrides,
  }
}
