import { describe, it, expect, beforeEach } from 'vitest'
import { metrics } from '../../services/metrics.js'

describe('metrics', () => {
  beforeEach(() => {
    metrics.reset()
  })

  it('trackTemplate incrementa contador general', () => {
    metrics.trackTemplate('welcome')
    metrics.trackTemplate('welcome')
    metrics.trackTemplate('ask_name')
    const r = metrics.report()
    expect(r.totalTemplateCalls).toBe(3)
  })

  it('trackTemplate registra uso por escenario', () => {
    metrics.trackTemplate('welcome')
    metrics.trackTemplate('welcome')
    metrics.trackTemplate('goodbye')
    const r = metrics.report()
    expect(r.templateUsage.welcome).toBe(2)
    expect(r.templateUsage.goodbye).toBe(1)
  })

  it('trackAi registra llamada exitosa', () => {
    metrics.trackAi('phone1', 1500, true)
    const r = metrics.report()
    expect(r.totalAiCalls).toBe(1)
    expect(r.aiFailures).toBe(0)
  })

  it('trackAi registra fallo', () => {
    metrics.trackAi('phone1', 3000, false)
    const r = metrics.report()
    expect(r.aiFailures).toBe(1)
    expect(r.totalAiCalls).toBe(1)
  })

  it('averageAiResponseTime se calcula correctamente', () => {
    metrics.trackAi('p1', 1000, true)
    metrics.trackAi('p2', 2000, true)
    const r = metrics.report()
    expect(r.averageAiResponseTime).toBe(1500)
  })

  it('averageAiResponseTime es 0 si no hay llamadas', () => {
    const r = metrics.report()
    expect(r.averageAiResponseTime).toBe(0)
  })

  it('trackAbandon incrementa contador', () => {
    metrics.trackAbandon('phone1')
    metrics.trackAbandon('phone2')
    const r = metrics.report()
    expect(r.abandonCount).toBe(2)
  })

  it('report devuelve snapshot con estructura completa', () => {
    metrics.trackTemplate('welcome')
    metrics.trackAi('p1', 1000, true)
    metrics.trackAbandon('p2')
    const r = metrics.report()
    expect(r).toHaveProperty('totalTemplateCalls')
    expect(r).toHaveProperty('totalAiCalls')
    expect(r).toHaveProperty('aiFailures')
    expect(r).toHaveProperty('templateUsage')
    expect(r).toHaveProperty('averageAiResponseTime')
    expect(r).toHaveProperty('abandonCount')
    expect(r.totalTemplateCalls).toBe(1)
    expect(r.totalAiCalls).toBe(1)
    expect(r.abandonCount).toBe(1)
  })

  it('reset limpia todos los contadores', () => {
    metrics.trackTemplate('welcome')
    metrics.trackAi('p1', 500, false)
    metrics.trackAbandon('p1')
    metrics.reset()
    const r = metrics.report()
    expect(r.totalTemplateCalls).toBe(0)
    expect(r.totalAiCalls).toBe(0)
    expect(r.aiFailures).toBe(0)
    expect(r.averageAiResponseTime).toBe(0)
    expect(r.abandonCount).toBe(0)
    expect(r.templateUsage).toEqual({})
  })
})
