import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { normalizeLeadId, isResolved, resolveLid } from '../../services/lead-id.js'
import type { LeadId } from '../../services/lead-id.js'
import { initDb, closeDb, getDb, saveDb } from '../../database/sqlite.js'

describe('lid resolution', () => {
  beforeEach(async () => {
    await initDb()
  })

  afterEach(() => {
    closeDb()
  })
  it('normalizeLeadId retorna lid:xxx para @lid', () => {
    const result = normalizeLeadId('123456789@lid')
    expect(result).toBe('lid:123456789')
    expect(isResolved(result as LeadId)).toBe(false)
  })

  it('resolveLid convierte lid:xxx a número', () => {
    const result = resolveLid('lid:999888777' as LeadId, '51999888777@s.whatsapp.net')
    expect(result).toBe('51999888777')
    expect(isResolved(result as LeadId)).toBe(true)
  })

  it('resolveLid con input ya resuelto es no-op', () => {
    const result = resolveLid('51999888777' as LeadId, '51944332211@s.whatsapp.net')
    expect(result).toBe('51999888777')
  })

  it('dos @lid distintos producen keys distintas', () => {
    const a = normalizeLeadId('111@lid')
    const b = normalizeLeadId('222@lid')
    expect(a).not.toBe(b)
    expect(a).toBe('lid:111')
    expect(b).toBe('lid:222')
  })

  it('@lid resuelto a número es indistinguible de número directo', () => {
    const fromLid = resolveLid('lid:999888777' as LeadId, '51999888777@s.whatsapp.net')
    const direct = normalizeLeadId('51999888777@s.whatsapp.net')
    expect(fromLid).toBe(direct)
  })

  it('@lid con device suffix (@lid) no cambia', () => {
    const result = normalizeLeadId('123456789:45@lid')
    expect(result).toBe('lid:123456789:45')
  })

  it('cadena completa: @lid → resuelto → normalizado', () => {
    const raw = '999888777@lid'
    const lid = normalizeLeadId(raw)
    expect(lid).toBe('lid:999888777')

    const resolved = resolveLid(lid as LeadId, '51999888777')
    expect(resolved).toBe('51999888777')
    expect(isResolved(resolved as LeadId)).toBe(true)
  })

  it('migrateLidToPn actualiza todas las tablas', () => {
    const db = getDb()
    const testLid = 'lid:xyz999'
    const testPn = '51994445550'

    db.run("INSERT OR REPLACE INTO dashboard_meta (phone, name, mode, last_activity) VALUES (?, 'Test LID', 'AI', ?)", [testLid, new Date().toISOString()])
    db.run("INSERT INTO dashboard_messages (phone, role, content, ts) VALUES (?, 'user', 'hola', ?)", [testLid, new Date().toISOString()])

    let stmt = db.prepare('SELECT phone FROM dashboard_meta WHERE phone = ?')
    stmt.bind([testLid])
    expect(stmt.step()).toBe(true)
    stmt.free()

    db.run("UPDATE dashboard_meta SET phone = ? WHERE phone = ?", [testPn, testLid])
    db.run("UPDATE dashboard_messages SET phone = ? WHERE phone = ?", [testPn, testLid])
    saveDb()

    stmt = db.prepare('SELECT phone FROM dashboard_meta WHERE phone = ?')
    stmt.bind([testPn])
    expect(stmt.step()).toBe(true)
    stmt.free()

    stmt = db.prepare('SELECT phone FROM dashboard_meta WHERE phone = ?')
    stmt.bind([testLid])
    expect(stmt.step()).toBe(false)
    stmt.free()
  })
})
