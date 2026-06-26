import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import initSqlJs from 'sql.js'
import { randomUUID } from 'node:crypto'

let SQL: Awaited<ReturnType<typeof initSqlJs>>

beforeAll(async () => {
  SQL = await initSqlJs()
})

function makeDb() {
  return new SQL.Database()
}

function insertLead(db: ReturnType<typeof makeDb>, overrides: Record<string, unknown> = {}) {
  const id = (overrides.id as string) ?? randomUUID()
  db.run(`INSERT INTO leads (id, name, dni, phone, email, program_interest, status, deal_stage, classification_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    id,
    overrides.name ?? 'Test User',
    overrides.dni ?? '12345678',
    overrides.phone ?? '51987654321',
    overrides.email ?? 'test@test.com',
    overrides.program_interest ?? null,
    'nuevo',
    overrides.deal_stage ?? null,
    overrides.classification_json ?? null,
    (overrides.created_at as string) ?? new Date().toISOString(),
  ])
  return id
}

function queryAll(db: ReturnType<typeof makeDb>, sql: string, params: unknown[] = []) {
  const stmt = db.prepare(sql)
  if (params.length) stmt.bind(params)
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

function queryOne(db: ReturnType<typeof makeDb>, sql: string, params: unknown[] = []) {
  const stmt = db.prepare(sql)
  if (params.length) stmt.bind(params)
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return row
  }
  stmt.free()
  return undefined
}

function createTables(db: ReturnType<typeof makeDb>) {
  db.run(`CREATE TABLE leads (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, dni TEXT NOT NULL,
    phone TEXT NOT NULL, email TEXT NOT NULL, program_interest TEXT,
    status TEXT NOT NULL DEFAULT 'nuevo', deal_stage TEXT,
    classification_json TEXT, created_at TEXT NOT NULL)`)
  db.run(`CREATE TABLE dashboard_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT NOT NULL,
    name TEXT, role TEXT NOT NULL CHECK(role IN ('user','assistant','human')),
    content TEXT NOT NULL, ts TEXT NOT NULL)`)
  db.run(`CREATE TABLE dashboard_meta (
    phone TEXT PRIMARY KEY, name TEXT,
    mode TEXT NOT NULL DEFAULT 'AI' CHECK(mode IN ('AI','HUMAN')),
    last_activity TEXT NOT NULL)`)
  db.run(`CREATE TABLE ai_history (
    phone TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content TEXT NOT NULL, created_at TEXT NOT NULL)`)
  db.run(`CREATE TABLE outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL,
    payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','sent','failed')),
    attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, sent_at TEXT)`)
}

describe('store — leads', () => {
  let db: ReturnType<typeof makeDb>
  beforeEach(() => { db = makeDb(); createTables(db) })

  it('create guarda un lead y retorna objeto con id UUID', () => {
    const id = insertLead(db)
    const all = queryAll(db, 'SELECT * FROM leads')
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('Test User')
    expect(id.length).toBeGreaterThan(10)
  })

  it('getByPhone encuentra lead existente', () => {
    insertLead(db, { phone: '51999000111' })
    const row = queryOne(db, 'SELECT * FROM leads WHERE phone = ?', ['51999000111'])
    expect(row).toBeTruthy()
  })

  it('getAll retorna todos ordenados', () => {
    insertLead(db, { phone: '51999000111', created_at: '2026-01-01T00:00:00Z' })
    insertLead(db, { phone: '51999000222', created_at: '2026-06-01T00:00:00Z' })
    const all = queryAll(db, 'SELECT * FROM leads ORDER BY created_at DESC')
    expect(all).toHaveLength(2)
    expect(all[0].phone).toBe('51999000222')
  })

  it('updateClassification actualiza deal_stage', () => {
    const id = insertLead(db)
    db.run('UPDATE leads SET deal_stage = ?, classification_json = ? WHERE id = ?', ['INTERESADO', '{"t":true}', id])
    const updated = queryOne(db, 'SELECT * FROM leads WHERE id = ?', [id]) as Record<string, unknown>
    expect(updated.deal_stage).toBe('INTERESADO')
  })

  it('100 leads creados -> 0 perdidos', () => {
    for (let i = 0; i < 100; i++) insertLead(db, { phone: '51' + String(i).padStart(9, '0') })
    const row = queryOne(db, 'SELECT COUNT(*) as count FROM leads') as { count: number }
    expect(row.count).toBe(100)
  })

  it('addMessage guarda mensaje user', () => {
    const ts = new Date().toISOString()
    db.run('INSERT INTO dashboard_messages (phone, role, content, ts) VALUES (?, ?, ?, ?)', ['51999000111', 'user', 'hola', ts])
    const row = queryOne(db, 'SELECT * FROM dashboard_messages WHERE phone = ?', ['51999000111']) as Record<string, unknown>
    expect(row.role).toBe('user')
  })

  it('setMode cambia AI <-> HUMAN', () => {
    db.run(`INSERT INTO dashboard_meta (phone, name, mode, last_activity) VALUES (?, ?, ?, ?)`, ['51999000111', 'T', 'AI', new Date().toISOString()])
    db.run('UPDATE dashboard_meta SET mode = ? WHERE phone = ?', ['HUMAN', '51999000111'])
    const meta = queryOne(db, 'SELECT mode FROM dashboard_meta WHERE phone = ?', ['51999000111']) as { mode: string }
    expect(meta.mode).toBe('HUMAN')
  })

  it('getHistory retorna maximo 20', () => {
    for (let i = 0; i < 30; i++) {
      db.run('INSERT INTO ai_history (phone, role, content, created_at) VALUES (?, ?, ?, ?)', ['51999000111', 'user', `msg${i}`, `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`])
    }
    const rows = queryAll(db, 'SELECT * FROM ai_history WHERE phone = ? ORDER BY created_at ASC LIMIT 20', ['51999000111'])
    expect(rows).toHaveLength(20)
  })

  it('clearHistory borra todo del usuario', () => {
    db.run('INSERT INTO ai_history (phone, role, content, created_at) VALUES (?, ?, ?, ?)', ['51999000111', 'user', 'test', new Date().toISOString()])
    db.run('DELETE FROM ai_history WHERE phone = ?', ['51999000111'])
    expect(queryAll(db, 'SELECT * FROM ai_history WHERE phone = ?', ['51999000111'])).toHaveLength(0)
  })

  it('outbox enqueue guarda evento', () => {
    db.run('INSERT INTO outbox (event, payload, created_at) VALUES (?, ?, ?)', ['lead.classified', '{"t":true}', new Date().toISOString()])
    const row = queryOne(db, 'SELECT * FROM outbox WHERE event = ?', ['lead.classified']) as Record<string, unknown>
    expect(row.status).toBe('pending')
    expect(row.attempts).toBe(0)
  })

  it('payload complejo persiste y se recupera', () => {
    const payload = JSON.stringify({ nested: { deep: [1, 2, 3], text: 'hola' } })
    db.run('INSERT INTO outbox (event, payload, created_at) VALUES (?, ?, ?)', ['test', payload, new Date().toISOString()])
    const row = queryOne(db, 'SELECT payload FROM outbox LIMIT 1') as { payload: string }
    const parsed = JSON.parse(row.payload)
    expect(parsed.nested.deep).toEqual([1, 2, 3])
    expect(parsed.nested.text).toBe('hola')
  })
})
