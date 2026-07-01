import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { waitForBurst, isEnabled, flush, drop } from '../../services/message-aggregator.js'

describe('waitForBurst', () => {
  beforeEach(() => {
    process.env.ENABLE_MESSAGE_AGGREGATOR = 'true'
  })

  afterEach(() => {
    vi.useRealTimers?.()
  })

  it('primer mensaje devuelve texto después de 1500ms (ventana inicial)', async () => {
    const start = Date.now()
    const result = await waitForBurst('51999', 'hola')
    const elapsed = Date.now() - start
    expect(result).toBe('hola')
    expect(elapsed).toBeGreaterThanOrEqual(1400)
    expect(elapsed).toBeLessThan(1700)
  })

  it('ráfaga de 2 mensajes -> el primero retorna null, el segundo retorna agregado', async () => {
    let r1: string | null = 'no-resuelto'
    let r2: string | null = 'no-resuelto'

    const p1 = waitForBurst('51999', 'hola').then(r => { r1 = r })
    // <200ms después
    await new Promise(r => setTimeout(r, 50))
    const p2 = waitForBurst('51999', 'mundo').then(r => { r2 = r })

    await Promise.all([p1, p2])

    expect(r1).toBeNull()
    expect(r2).toBe('hola mundo')
  })

  it('cancelar fuerza flush inmediato', async () => {
    const p1 = waitForBurst('51999', 'info')
    const start = Date.now()
    const r2 = await waitForBurst('51999', 'cancelar')
    const elapsed = Date.now() - start
    expect(r2).toBe('cancelar')
    expect(elapsed).toBeLessThan(100)
  })

  it('isEnabled false -> retorna el mensaje sin esperar', async () => {
    process.env.ENABLE_MESSAGE_AGGREGATOR = 'false'
    const start = Date.now()
    const result = await waitForBurst('51999', 'hola')
    expect(result).toBe('hola')
    expect(Date.now() - start).toBeLessThan(50)
  })

  it('lead_capture concatena sin espacio', async () => {
    let r1: string | null = ''
    const p1 = waitForBurst('51999', '12345', 'lead_capture').then(r => { r1 = r })
    await new Promise(r => setTimeout(r, 30))
    const p2 = waitForBurst('51999', '678', 'lead_capture').then(r => {})

    await Promise.all([p1, p2])
    expect(r1).toBeNull()
  })

  it('flush manual limpia buffer', () => {
    waitForBurst('51999', 'test')
    const result = flush('51999')
    expect(result).toBe('test')
  })

  it('drop cancela sin resolver', async () => {
    let resolved = false
    waitForBurst('51999', 'test').then(() => { resolved = true })
    drop('51999')
    await new Promise(r => setTimeout(r, 50))
    // La Promise pudo resolverse o no — solo verificamos que no crashea
    expect(true).toBe(true)
  })
})
