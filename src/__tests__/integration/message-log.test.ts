import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { initDb, getDb } from '../../database/sqlite.js'
import { dashboard } from '../../services/store.js'
import { messageLog } from '../../services/message-log.js'

beforeAll(async () => {
  await initDb()
})

function cleanDashboard() {
  getDb().run('DELETE FROM dashboard_messages')
  getDb().run('DELETE FROM dashboard_meta')
}

function queryAll(sql: string, params: unknown[] = []) {
  const stmt = getDb().prepare(sql)
  if (params.length) stmt.bind(params)
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

function queryOne(sql: string, params: unknown[] = []) {
  const stmt = getDb().prepare(sql)
  if (params.length) stmt.bind(params)
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return row
  }
  stmt.free()
  return undefined
}

beforeEach(() => {
  cleanDashboard()
})

describe('messageLog', () => {
  it('incoming guarda mensaje + nombre en dashboard', () => {
    messageLog.incoming('51999000111', 'hola', 'Test User')
    const messages = queryAll('SELECT * FROM dashboard_messages WHERE phone = ?', ['51999000111'])
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toBe('hola')

    const meta = queryOne('SELECT * FROM dashboard_meta WHERE phone = ?', ['51999000111']) as Record<string, unknown>
    expect(meta.name).toBe('Test User')
  })

  it('outgoing guarda como assistant', () => {
    messageLog.outgoing('51999000111', 'Bienvenido al CEE')
    const messages = queryAll('SELECT * FROM dashboard_messages WHERE phone = ?', ['51999000111'])
    expect(messages[0].role).toBe('assistant')
    expect(messages[0].content).toBe('Bienvenido al CEE')
  })

  it('human guarda como human + nombre del operador', () => {
    messageLog.human('51999000111', 'Operador', 'Mensaje del operador')
    const messages = queryAll('SELECT * FROM dashboard_messages WHERE phone = ?', ['51999000111'])
    expect(messages[0].role).toBe('human')
    expect(messages[0].content).toBe('Mensaje del operador')

    const meta = queryOne('SELECT name FROM dashboard_meta WHERE phone = ?', ['51999000111']) as { name: string }
    expect(meta.name).toBe('Operador')
  })

  it('shouldRespond con modo AI → true', () => {
    expect(messageLog.shouldRespond('new-phone')).toBe(true)
  })

  it('shouldRespond con modo HUMAN → false', () => {
    dashboard.setMode('51999000111', 'HUMAN')
    expect(messageLog.shouldRespond('51999000111')).toBe(false)
  })

  it('setMode cambia y shouldRespond refleja el cambio', () => {
    messageLog.setMode('51999000111', 'HUMAN')
    expect(messageLog.shouldRespond('51999000111')).toBe(false)
    messageLog.setMode('51999000111', 'AI')
    expect(messageLog.shouldRespond('51999000111')).toBe(true)
  })

  it('outgoing con metadata persiste decision_trace', () => {
    const phone = '51999888001'
    dashboard.addMessage(phone, 'assistant', 'respuesta de prueba', undefined, 'template')
    const msgs = queryAll('SELECT * FROM dashboard_messages WHERE phone = ?', [phone]) as Array<{ metadata: string | null }>
    expect(msgs.length).toBeGreaterThanOrEqual(1)
    expect(msgs[0].metadata).toBe('template')
  })
})
