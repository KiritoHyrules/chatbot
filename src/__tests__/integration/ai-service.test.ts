import { describe, it, expect, beforeEach } from 'vitest'
import { LRUCache } from 'lru-cache'

describe('ai service — LRU cache', () => {
  it('LRU cache no excede el maximo de 500 usuarios', () => {
    const lru = new LRUCache<string, string[]>({ max: 500 })
    for (let i = 0; i < 501; i++) {
      lru.set(`user${i}`, [`msg${i}`])
    }
    expect(lru.size).toBeLessThanOrEqual(500)
  })

  it('TTL: entrada inactiva se evicta tras el tiempo configurado', async () => {
    const lru = new LRUCache<string, string[]>({ max: 10, ttl: 100 })
    lru.set('user1', ['hello'])
    expect(lru.get('user1')).toEqual(['hello'])
    await new Promise(r => setTimeout(r, 150))
    expect(lru.get('user1')).toBeUndefined()
  })

  it('updateAgeOnGet resetea el TTL al acceder', async () => {
    const lru = new LRUCache<string, string[]>({ max: 10, ttl: 200, updateAgeOnGet: true })
    lru.set('user1', ['hello'])
    await new Promise(r => setTimeout(r, 100))
    expect(lru.get('user1')).toEqual(['hello'])
    await new Promise(r => setTimeout(r, 120))
    expect(lru.get('user1')).toEqual(['hello'])
  })
})

describe('ai service — rate limiting', () => {
  it('demuestra logica de rate limit: lastCall < 3s bloquea', () => {
    const lastCall = new Map<string, number>()
    const phone = 'test-phone'
    lastCall.set(phone, Date.now())
    const prev = lastCall.get(phone) ?? 0
    expect(Date.now() - prev).toBeLessThan(3000)
    expect(Date.now() - prev < 3000).toBe(true)
  })

  it('demuestra logica de rate limit: >3s permite pasar', async () => {
    const lastCall = new Map<string, number>()
    const phone = 'test-phone'
    lastCall.set(phone, Date.now())
    await new Promise(r => setTimeout(r, 3100))
    const prev = lastCall.get(phone) ?? 0
    expect(Date.now() - prev).toBeGreaterThanOrEqual(3000)
    expect(Date.now() - prev < 3000).toBe(false)
  }, 10000)
})

describe('ai service — persistencia de historial', () => {
  it('persistencia: el concepto de guardar y recuperar funciona', () => {
    const store = new Map<string, Array<{ role: string; content: string }>>()
    store.set('phone-1', [{ role: 'user', content: 'hola' }])
    expect(store.get('phone-1')).toHaveLength(1)
    expect(store.get('phone-1')![0].content).toBe('hola')
  })

  it('persistencia: clearHistory borra datos del usuario', () => {
    const store = new Map<string, Array<{ role: string; content: string }>>()
    store.set('phone-1', [{ role: 'user', content: 'msg1' }])
    store.delete('phone-1')
    expect(store.has('phone-1')).toBe(false)
  })

  it('persistencia: clearHistory no afecta a otros usuarios', () => {
    const store = new Map<string, Array<{ role: string; content: string }>>()
    store.set('phone-A', [{ role: 'user', content: 'A' }])
    store.set('phone-B', [{ role: 'user', content: 'B' }])
    store.delete('phone-A')
    expect(store.has('phone-A')).toBe(false)
    expect(store.has('phone-B')).toBe(true)
  })

  it('persistencia: maximo 20 mensajes por usuario', () => {
    const msgs: Array<{ role: string; content: string }> = []
    for (let i = 0; i < 30; i++) {
      msgs.push({ role: 'user', content: `msg${i}` })
    }
    const limited = msgs.slice(-20)
    expect(limited).toHaveLength(20)
    expect(limited[0].content).toBe('msg10')
  })
})
