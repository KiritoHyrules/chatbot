import { describe, it, expect, afterEach } from 'vitest'
import { signPayload } from '../../services/outbox.js'

describe('outbox HMAC', () => {
  afterEach(() => {
    delete process.env.N8N_WEBHOOK_SECRET
  })

  it('genera firma X-CEE-Signature cuando N8N_WEBHOOK_SECRET está definido', () => {
    process.env.N8N_WEBHOOK_SECRET = 'test-secret'
    const sig = signPayload('{"event":"test"}')
    expect(sig).toBeTruthy()
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/)
  })

  it('no genera firma si N8N_WEBHOOK_SECRET no está definido', () => {
    const sig = signPayload('{"event":"test"}')
    expect(sig).toBeNull()
  })

  it('firma cambia con secret distinto', () => {
    process.env.N8N_WEBHOOK_SECRET = 'secret-a'
    const sigA = signPayload('test')
    process.env.N8N_WEBHOOK_SECRET = 'secret-b'
    const sigB = signPayload('test')
    expect(sigA).not.toBe(sigB)
  })

  it('firma es consistente con el mismo secret y payload', () => {
    process.env.N8N_WEBHOOK_SECRET = 'same'
    const sig1 = signPayload('same payload')
    const sig2 = signPayload('same payload')
    expect(sig1).toBe(sig2)
  })
})
