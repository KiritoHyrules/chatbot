import { describe, it, expect, beforeEach } from 'vitest'
import { authGuard } from '../../middleware/auth.js'

type SimpleRes = { writeHead: (c: number, h: Record<string, string>) => void; end: (s: string) => void }

function makeRes(): SimpleRes {
  return {
    writeHead: (code: number, headers: Record<string, string>) => {},
    end: (body: string) => {},
  }
}

describe('authGuard', () => {
  beforeEach(() => {
    process.env.DASHBOARD_SECRET = 'my-secret'
  })

  it('sin token → retorna false', () => {
    const res = makeRes()
    expect(authGuard({ url: '/api/dashboard/state' }, res)).toBe(false)
  })

  it('token correcto por query param → retorna true', () => {
    const res = makeRes()
    expect(authGuard({ url: '/api/dashboard/state?token=my-secret' }, res)).toBe(true)
  })

  it('token correcto por header Bearer → retorna true', () => {
    const res = makeRes()
    expect(authGuard({ url: '/api/dashboard/state', headers: { authorization: 'Bearer my-secret' } }, res)).toBe(true)
  })

  it('token incorrecto → retorna false', () => {
    const res = makeRes()
    expect(authGuard({ url: '/api/dashboard/state?token=wrong' }, res)).toBe(false)
  })

  it('token vacío → retorna false', () => {
    const res = makeRes()
    expect(authGuard({ url: '/api/dashboard/state?token=' }, res)).toBe(false)
  })

  it('usa default si DASHBOARD_SECRET no definido', () => {
    delete process.env.DASHBOARD_SECRET
    const res = makeRes()
    expect(authGuard({ url: '/api/dashboard/state?token=cambiar-en-produccion' }, res)).toBe(true)
  })
})
