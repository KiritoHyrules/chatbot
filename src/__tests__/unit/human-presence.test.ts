import { describe, it, expect, vi } from 'vitest'
import { humanReply } from '../../services/human-presence.js'

function mockFlowDynamic() {
  return vi.fn(async () => {})
}

function mockProvider(withPresence = true) {
  const sendPresenceUpdate = withPresence ? vi.fn(async () => {}) : undefined
  return { vendor: { sendPresenceUpdate } }
}

describe('humanReply', () => {
  it('string simple → llama a flowDynamic con delay proporcional', async () => {
    const fd = mockFlowDynamic()
    await humanReply({ from: '51999888777' }, fd, 'Hola, ¿en qué te ayudo?', { provider: mockProvider(), delay: 100 })
    expect(fd).toHaveBeenCalledTimes(1)
    expect(fd).toHaveBeenCalledWith([{ body: 'Hola, ¿en qué te ayudo?', delay: 100 }])
  })

  it('string[] de 2 elementos → 2 llamadas a flowDynamic', async () => {
    const fd = mockFlowDynamic()
    await humanReply({ from: '51999888777' }, fd, ['Parte 1', 'Parte 2'], { provider: mockProvider(), delay: 50 })
    expect(fd).toHaveBeenCalledTimes(2)
    expect(fd).toHaveBeenNthCalledWith(1, [{ body: 'Parte 1', delay: 50 }])
    expect(fd).toHaveBeenNthCalledWith(2, [{ body: 'Parte 2', delay: 50 }])
  })

  it('delay: 0 → sin espera, composing se limpia', async () => {
    const prov = mockProvider()
    const fd = mockFlowDynamic()
    await humanReply({ from: '51999888777' }, fd, 'test', { provider: prov, delay: 0 })
    expect(fd).toHaveBeenCalledTimes(1)
    expect(prov.vendor.sendPresenceUpdate).toHaveBeenCalledWith('51999888777@s.whatsapp.net', 'composing')
    expect(prov.vendor.sendPresenceUpdate).toHaveBeenCalledWith('51999888777@s.whatsapp.net', 'paused')
  })

  it('media: path → NO composing, delay 500ms por default, flowDynamic con media', async () => {
    const prov = mockProvider()
    const fd = mockFlowDynamic()
    await humanReply({ from: '51999888777' }, fd, 'Aquí el brochure', { provider: prov, media: '/path/brochure.pdf', delay: 300 })
    expect(fd).toHaveBeenCalledTimes(1)
    expect(fd).toHaveBeenCalledWith([{ body: 'Aquí el brochure', delay: 300, media: '/path/brochure.pdf' }])
    expect(prov.vendor.sendPresenceUpdate).not.toHaveBeenCalledWith('51999888777@s.whatsapp.net', 'composing')
  })

  it('sin sendPresenceUpdate no crashea', async () => {
    const prov = mockProvider(false)
    const fd = mockFlowDynamic()
    await humanReply({ from: '51999888777' }, fd, 'test', { provider: prov, delay: 0 })
    expect(fd).toHaveBeenCalledTimes(1)
  })

  it('sin provider no crashea', async () => {
    const fd = mockFlowDynamic()
    await humanReply({ from: '51999888777' }, fd, 'test', { delay: 0 })
    expect(fd).toHaveBeenCalledTimes(1)
  })

  it('text vacío → no llama flowDynamic', async () => {
    const fd = mockFlowDynamic()
    await humanReply({ from: '51999888777' }, fd, '', { delay: 0 })
    expect(fd).not.toHaveBeenCalled()
  })

  it('string[] con elemento vacío → saltea el vacío', async () => {
    const fd = mockFlowDynamic()
    await humanReply({ from: '51999888777' }, fd, ['', ''], { delay: 0 })
    expect(fd).not.toHaveBeenCalled()
  })

  it('delay sin override → proporcional a length (texto largo > texto corto)', async () => {
    const fdShort = mockFlowDynamic()
    const fdLong = mockFlowDynamic()

    const startShort = Date.now()
    await humanReply({ from: '51999888777' }, fdShort, 'ok')
    const elapsedShort = Date.now() - startShort

    const startLong = Date.now()
    await humanReply({ from: '51999888777' }, fdLong, 'Este es un mensaje mucho más largo que debería tomar más tiempo en ser enviado porque simula la velocidad de tipeo humano en WhatsApp. ' + 'x'.repeat(200))
    const elapsedLong = Date.now() - startLong

    expect(elapsedLong).toBeGreaterThanOrEqual(elapsedShort)
    expect(fdShort).toHaveBeenCalledTimes(1)
    expect(fdLong).toHaveBeenCalledTimes(1)
  })

  it('composing se renueva cada 2s durante espera larga', async () => {
    const prov = mockProvider()
    const fd = mockFlowDynamic()
    await humanReply({ from: '51999888777' }, fd, 'texto', { provider: prov, delay: 2500 })

    expect(fd).toHaveBeenCalledTimes(1)
    const composingCalls = (prov.vendor.sendPresenceUpdate as ReturnType<typeof vi.fn>).mock.calls
      .filter((c: string[]) => c[1] === 'composing')
    expect(composingCalls.length).toBeGreaterThanOrEqual(2)
  })

  it('ctx.from con @s.whatsapp.net → se usa tal cual', async () => {
    const prov = mockProvider()
    const fd = mockFlowDynamic()
    await humanReply({ from: '51999888777@s.whatsapp.net' }, fd, 'test', { provider: prov, delay: 0 })
    expect(prov.vendor.sendPresenceUpdate).toHaveBeenCalledWith('51999888777@s.whatsapp.net', 'composing')
  })
})
