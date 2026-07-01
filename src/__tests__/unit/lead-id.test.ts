import { describe, it, expect } from 'vitest'
import { normalizeLeadId, isResolved, resolveLid } from '../../services/lead-id.js'
import type { LeadId } from '../../services/lead-id.js'

describe('normalizeLeadId', () => {
  it('@s.whatsapp.net → número normalizado', () => {
    expect(normalizeLeadId('51999888777@s.whatsapp.net')).toBe('51999888777')
  })

  it('@c.us sin código de país → se agrega 51', () => {
    expect(normalizeLeadId('999888777@c.us')).toBe('51999888777')
  })

  it('@lid → prefijo lid:', () => {
    expect(normalizeLeadId('123456789@lid')).toBe('lid:123456789')
  })

  it('multi-device con sufijo :1 → se elimina', () => {
    expect(normalizeLeadId('51999888777:1@s.whatsapp.net')).toBe('51999888777')
  })

  it('@g.us → throw', () => {
    expect(() => normalizeLeadId('123@g.us')).toThrow('Group JIDs')
  })

  it('dígitos sin sufijo ni código → se agrega 51', () => {
    expect(normalizeLeadId('999888777')).toBe('51999888777')
  })

  it('length inválido (< 10 dígitos) → throw', () => {
    expect(() => normalizeLeadId('12345@s.whatsapp.net')).toThrow('length')
  })

  it('JID vacío → throw', () => {
    expect(() => normalizeLeadId('')).toThrow('empty')
  })

  it('número ya con código 51 → se mantiene igual', () => {
    expect(normalizeLeadId('51999888777')).toBe('51999888777')
  })

  it('multi-device con sufijo :2 en @c.us', () => {
    expect(normalizeLeadId('51944332211:2@c.us')).toBe('51944332211')
  })
})

describe('isResolved', () => {
  it('número normalizado → true', () => {
    expect(isResolved('51999888777' as LeadId)).toBe(true)
  })

  it('lid:xxx → false', () => {
    expect(isResolved('lid:123' as LeadId)).toBe(false)
  })
})

describe('resolveLid', () => {
  it('resuelve lid:xxx a número normalizado', () => {
    const result = resolveLid('lid:999888777' as LeadId, '51999888777@s.whatsapp.net')
    expect(result).toBe('51999888777')
  })

  it('ya resuelto → se mantiene igual', () => {
    const result = resolveLid('51999888777' as LeadId, '51944332211@s.whatsapp.net')
    expect(result).toBe('51999888777')
  })
})
