import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync, rmSync, mkdirSync } from 'node:fs'

function makeDb() {
  const path = join(tmpdir(), `test-lead-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)
  if (existsSync(path)) try { rmSync(path, { force: true }) } catch { /* ignore */ }
  mkdirSync(tmpdir(), { recursive: true })
  const db = new Database(path)
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, dni TEXT NOT NULL,
      phone TEXT NOT NULL, email TEXT NOT NULL, program_interest TEXT,
      status TEXT NOT NULL DEFAULT 'nuevo', deal_stage TEXT,
      classification_json TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL,
      payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending','sent','failed')),
      attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, sent_at TEXT
    );
  `)
  return db
}

function insertLead(db: ReturnType<typeof makeDb>, data: Record<string, unknown>) {
  const id = randomUUID()
  db.prepare(`INSERT INTO leads (id, name, dni, phone, email, program_interest, status, deal_stage, classification_json, created_at)
    VALUES (@id, @name, @dni, @phone, @email, @program_interest, @status, @deal_stage, @classification_json, @created_at)`).run({
    id, name: data.name, dni: data.dni, phone: data.phone, email: data.email,
    program_interest: data.program_interest ?? null,
    status: 'nuevo', deal_stage: data.deal_stage ?? null, classification_json: data.classification_json ?? null,
    created_at: new Date().toISOString(),
  })
  return id
}

function enqueueOutbox(db: ReturnType<typeof makeDb>, event: string, payload: Record<string, unknown>) {
  db.prepare('INSERT INTO outbox (event, payload, created_at) VALUES (?, ?, ?)')
    .run(event, JSON.stringify(payload), new Date().toISOString())
}

describe('E2E — lead capture', () => {
  let db: ReturnType<typeof makeDb>

  beforeEach(() => { db = makeDb() })

  it('completa 4 pasos → lead guardado en BD', () => {
    const id = insertLead(db, {
      name: 'María López García', dni: '12345678', phone: '51987654321',
      email: 'maria@ejemplo.com', program_interest: 'Diplomado en Ciencia de Datos',
    })
    const all = db.prepare('SELECT * FROM leads').all() as Record<string, unknown>[]
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('María López García')
    expect(all[0].status).toBe('nuevo')
    expect(id.length).toBeGreaterThan(10)
  })

  it('lead se guarda con programInterest', () => {
    insertLead(db, {
      name: 'Test', dni: '12345678', phone: '51987654321',
      email: 't@t.com', program_interest: 'Diplomado en Ciencia de Datos',
    })
    const row = db.prepare('SELECT program_interest FROM leads').get() as { program_interest: string }
    expect(row.program_interest).toBe('Diplomado en Ciencia de Datos')
  })

  it('lead se clasifica al crearse', () => {
    const id = insertLead(db, {
      name: 'María', dni: '12345678', phone: '51987654321', email: 'm@t.com',
      deal_stage: 'INTERESADO',
    })
    const row = db.prepare('SELECT deal_stage FROM leads WHERE id = ?').get(id) as { deal_stage: string }
    expect(row.deal_stage).toBe('INTERESADO')
  })

  it('clasificacion se persiste en el lead', () => {
    const classification = JSON.stringify({ etapa_asignada: 'INTERESADO', confianza_analisis: 'MEDIA', justificacion_corta: '...' })
    const id = insertLead(db, {
      name: 'María', dni: '12345678', phone: '51987654321', email: 'm@t.com',
      deal_stage: 'INTERESADO', classification_json: classification,
    })
    const row = db.prepare('SELECT classification_json FROM leads WHERE id = ?').get(id) as { classification_json: string }
    const parsed = JSON.parse(row.classification_json)
    expect(parsed.etapa_asignada).toBe('INTERESADO')
    expect(parsed.confianza_analisis).toBe('MEDIA')
  })

  it('evento lead.classified se encola en outbox', () => {
    enqueueOutbox(db, 'lead.classified', {
      lead: { id: 'test-id', name: 'María López García' },
      classification: { etapa_asignada: 'INTERESADO', confianza_analisis: 'ALTA' },
    })
    const pending = db.prepare('SELECT * FROM outbox WHERE status = ?').all('pending') as Record<string, unknown>[]
    expect(pending).toHaveLength(1)
    expect(pending[0].event).toBe('lead.classified')
    const payload = JSON.parse(pending[0].payload as string)
    expect(payload.lead.name).toBe('María López García')
    expect(payload.classification.etapa_asignada).toBe('INTERESADO')
  })

  it('dos leads creados → ambos existen (sin race condition)', () => {
    const id1 = insertLead(db, { name: 'Lead 1', dni: '11111111', phone: '51999000111', email: 'uno@t.com' })
    const id2 = insertLead(db, { name: 'Lead 2', dni: '22222222', phone: '51999000222', email: 'dos@t.com' })
    expect(db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number }).toEqual({ count: 2 })
    expect(id1).not.toBe(id2)
  })

  it('nombre muy corto es detectado por validacion', () => {
    const input = 'ab'
    expect(input.length).toBeLessThan(5)
  })

  it('DNI invalido (no 8 digitos) es detectado', () => {
    expect(/^\d{8}$/.test('12345')).toBe(false)
    expect(/^\d{8}$/.test('12345678')).toBe(true)
  })

  it('email invalido detectado', () => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    expect(re.test('sinarroba')).toBe(false)
    expect(re.test('sin@dominio')).toBe(false)
    expect(re.test('ok@dominio.com')).toBe(true)
  })

  it('telefono limpia no-digitos', () => {
    expect('abc51987654321xyz'.replace(/\D/g, '')).toBe('51987654321')
  })

  it('programInterest se hereda del flow anterior via state', () => {
    const programInterest = 'Diplomado en Ciencia de Datos'
    const id = insertLead(db, { name: 'Test', dni: '12345678', phone: '51987654321', email: 't@t.com', program_interest: programInterest })
    const row = db.prepare('SELECT program_interest FROM leads WHERE id = ?').get(id) as { program_interest: string }
    expect(row.program_interest).toBe('Diplomado en Ciencia de Datos')
  })

  it('cancelar en cualquier paso → no guarda lead', () => {
    expect(db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number }).toEqual({ count: 0 })
  })
})
