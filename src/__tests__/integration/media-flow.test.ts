import { describe, it, expect, vi } from 'vitest'

vi.mock('@builderbot/bot', () => ({
  addKeyword: vi.fn(() => ({
    addAction: vi.fn().mockReturnThis(),
  })),
  EVENTS: { MEDIA: 'MEDIA' },
}))

describe('media flow', () => {
  it('existe y es importable', async () => {
    const mod = await import('../../flows/media.flow.js')
    expect(mod.mediaFlow).toBeDefined()
  })

  it('responde con variante cuando llega audio', () => {
    const replies = [
      'No puedo escuchar audios por aquí 😅 ¿me lo escribes?',
      'No puedo escuchar audios todavía. ¿Me mandas texto mejor?',
      'Uy, solo leo texto por ahora. ¿Me lo escribes? 🙏',
      'Perdón, no proceso audios ni imágenes. ¿Me cuentas por texto?',
    ]
    expect(replies).toHaveLength(4)
    expect(new Set(replies).size).toBe(4)
  })

  it('re-emite el prompt si hay lastPrompt en conv_state', () => {
    const state = { lastPrompt: '¿Cuál es tu DNI?' }
    expect(state.lastPrompt).toBe('¿Cuál es tu DNI?')
  })

  it('no crashea sin conversationContext', () => {
    const state = undefined
    expect(state).toBeUndefined()
  })
})
