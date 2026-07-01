import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDb, saveDb } from '../sqlite.js'
import { normalizeLeadId } from '../../services/lead-id.js'

const DATA_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DATA_DIR, 'cee.db')
const CONV_PATH = join(DATA_DIR, 'conversations.json')
const MIGRATION_ID = '001'

export function migrate001(): void {
  const db = getDb()

  db.run(`CREATE TABLE IF NOT EXISTS _migrations (
    id TEXT PRIMARY KEY,
    ran_at TEXT NOT NULL
  )`)

  const stmt = db.prepare("SELECT id FROM _migrations WHERE id = ?")
  stmt.bind([MIGRATION_ID])
  if (stmt.step()) {
    stmt.free()
    console.log(`[MIGRATIONS] ${MIGRATION_ID} ya fue ejecutada, saltando.`)
    return
  }
  stmt.free()

  const ts = Date.now()
  try { copyFileSync(DB_PATH, `${DB_PATH}.backup-pre-${MIGRATION_ID}-${ts}`) } catch { /* ok si no existe */ }
  try { copyFileSync(CONV_PATH, `${CONV_PATH}.backup-pre-${MIGRATION_ID}-${ts}`) } catch { /* ok */ }

  console.log(`[MIGRATIONS] Ejecutando migración ${MIGRATION_ID}: normalizar lead_ids...`)

  db.run(`CREATE TABLE IF NOT EXISTS conv_state (
    phone TEXT PRIMARY KEY,
    state TEXT NOT NULL DEFAULT 'IDLE',
    data_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
  )`)

  normalizeColumn(db, 'leads', 'phone')
  normalizeColumn(db, 'leads', 'id', true)
  normalizeColumn(db, 'dashboard_messages', 'phone')
  normalizeColumn(db, 'dashboard_meta', 'phone')
  normalizeColumn(db, 'ai_history', 'phone')

  normalizeOutboxPayloads(db)

  db.run("INSERT INTO _migrations (id, ran_at) VALUES (?, ?)", [MIGRATION_ID, new Date().toISOString()])
  saveDb()

  console.log(`[MIGRATIONS] Migración ${MIGRATION_ID} completada exitosamente.`)
}

function normalizeColumn(db: ReturnType<typeof getDb>, table: string, column: string, isPk = false): void {
  const stmt = db.prepare(`SELECT ${column} FROM ${table}`)
  const updates: Array<[string, string]> = []
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, string>
    const original = row[column]
    if (!original) continue
    try {
      const normalized = normalizeLeadId(original)
      if (normalized !== original) {
        updates.push([original, normalized])
      }
    } catch {
      /* skip invalid JIDs */
    }
  }
  stmt.free()

  for (const [oldVal, newVal] of updates) {
    try {
      if (isPk) {
        db.run(`UPDATE OR IGNORE ${table} SET ${column} = ? WHERE ${column} = ?`, [newVal, oldVal])
      } else {
        db.run(`UPDATE ${table} SET ${column} = ? WHERE ${column} = ?`, [newVal, oldVal])
      }
    } catch {
      console.warn(`[MIGRATIONS] No se pudo actualizar ${table}.${column}: ${oldVal} -> ${newVal}`)
    }
  }

  if (updates.length > 0) {
    console.log(`[MIGRATIONS] Normalizadas ${updates.length} filas en ${table}.${column}`)
  }
}

function normalizeOutboxPayloads(db: ReturnType<typeof getDb>): void {
  const stmt = db.prepare("SELECT id, payload FROM outbox")
  const updates: Array<[number, string]> = []
  while (stmt.step()) {
    const row = stmt.getAsObject() as { id: number; payload: string }
    try {
      const parsed = JSON.parse(row.payload)
      let changed = false

      if (parsed.lead?.phone) {
        try {
          parsed.lead.phone = normalizeLeadId(parsed.lead.phone)
          changed = true
        } catch { /* skip */ }
      }
      if (parsed.lead?.id && !parsed.lead.id.includes('-')) {
        try {
          parsed.lead.id = normalizeLeadId(parsed.lead.id)
          changed = true
        } catch { /* skip */ }
      }

      if (changed) {
        updates.push([row.id, JSON.stringify(parsed)])
      }
    } catch {
      /* skip malformed JSON */
    }
  }
  stmt.free()

  for (const [id, newPayload] of updates) {
    db.run("UPDATE outbox SET payload = ? WHERE id = ?", [newPayload, id])
  }

  if (updates.length > 0) {
    console.log(`[MIGRATIONS] Normalizados ${updates.length} payloads en outbox`)
  }
}
