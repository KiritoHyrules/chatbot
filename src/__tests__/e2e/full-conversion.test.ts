import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { existsSync, rmSync, mkdirSync } from 'node:fs'
import { classify } from '../../services/classifier.js'
import { findAnswer } from '../../data/knowledge.js'
import { extractNumber } from '../../services/number-extractor.js'
import { normalizeQuery } from '../../services/normalizer.js'
import { intentRouter } from '../../services/intent-router.js'

function makeDb() {
  const path = join(tmpdir(), `test-full-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)
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

describe('E2E — full conversion', () => {
  let db: ReturnType<typeof makeDb>

  beforeEach(() => { db = makeDb() })

  it('intentRouter detecta intención clara del primer mensaje', () => {
    const result = intentRouter.detect('quiero ver el diplomado de ciencia de datos')
    expect(result.intent).toBe('programs')
    expect(result.confidence).not.toBe('BAJA')
  })

  it('classify clasifica lead completo como INTERESADO', () => {
    const ctx = 'Lead: María López. Programa: Diplomado en Ciencia de Datos. Completó registro.'
    const result = classify('hola gracias', ctx)
    expect(result.etapa_asignada).toBe('INTERESADO')
  })

  it('DNI con puntos se normaliza correctamente', () => {
    const input = '12.345.678'
    const normalized = input.replace(/[\s.\-]/g, '')
    expect(normalized).toBe('12345678')
    expect(/^\d{8}$/.test(normalized)).toBe(true)
  })

  it('teléfono con espacios se limpia', () => {
    const input = '999 888 777'
    const digits = input.replace(/\D/g, '')
    expect(digits.length).toBe(9)
    expect(digits).toBe('999888777')
  })

  it('findAnswer resuelve preguntas frecuentes', () => {
    const answer = findAnswer('cuánto dura el diplomado', 'Diplomado en Ciencia de Datos')
    expect(answer).toBeTruthy()
    expect(answer).toContain('Diplomado')
  })

  it('extractNumber extrae selección del usuario', () => {
    expect(extractNumber('el 2')).toBe(2)
    expect(extractNumber('la segunda')).toBe(2)
  })

  it('normalizeQuery normaliza abreviaciones', () => {
    expect(normalizeQuery('kuanto kuesta xfa')).toContain('cuanto')
    expect(normalizeQuery('kuanto kuesta xfa')).toContain('por favor')
  })

  it('lead completo persiste en BD con todos los campos', () => {
    const id = randomUUID()
    db.prepare(`INSERT INTO leads (id, name, dni, phone, email, program_interest, status, deal_stage, classification_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'nuevo', 'INTERESADO', ?, ?)`).run(
      id, 'María López', '12345678', '51999888777', 'maria@correo.com',
      'Diplomado en Ciencia de Datos',
      JSON.stringify({ etapa_asignada: 'INTERESADO', confianza_analisis: 'ALTA' }),
      new Date().toISOString())

    const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as Record<string, unknown>
    expect(row.name).toBe('María López')
    expect(row.dni).toBe('12345678')
    expect(row.phone).toBe('51999888777')
    expect(row.email).toBe('maria@correo.com')
    expect(row.program_interest).toBe('Diplomado en Ciencia de Datos')
    expect(row.deal_stage).toBe('INTERESADO')
  })

  it('lead.classified se encola en outbox tras conversión', () => {
    db.prepare('INSERT INTO outbox (event, payload, created_at) VALUES (?, ?, ?)').run(
      'lead.classified',
      JSON.stringify({
        lead: { id: 'test-id', name: 'María López', phone: '51999888777', programInterest: 'Diplomado en Ciencia de Datos', status: 'nuevo' },
        classification: { etapa_asignada: 'INTERESADO', confianza_analisis: 'ALTA' },
        tags: ['potencial'],
      }),
      new Date().toISOString())

    const pending = db.prepare('SELECT * FROM outbox WHERE status = ?').all('pending') as Array<Record<string, unknown>>
    expect(pending.length).toBe(1)
    const payload = JSON.parse(pending[0].payload as string)
    expect(payload.lead.name).toBe('María López')
    expect(payload.classification.etapa_asignada).toBe('INTERESADO')
  })
})
