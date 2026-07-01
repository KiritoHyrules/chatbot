import { getDb, saveDb, isDbHealthy } from '../database/sqlite.js'
import { randomUUID } from 'node:crypto'

function db() { return getDb() }

// Buffer de escritura para cuando la DB no está disponible
const writeBuffer: Array<{ sql: string; params: unknown[] }> = []
let dbAvailable = true
let flushTimer: ReturnType<typeof setInterval> | null = null

function startBufferFlush() {
  if (flushTimer) return
  flushTimer = setInterval(() => {
    if (writeBuffer.length === 0) return
    if (!isDbHealthy()) return
    const batch = writeBuffer.splice(0, writeBuffer.length)
    let flushed = 0
    for (const item of batch) {
      try {
        db().run(item.sql, item.params)
        flushed++
      } catch (err) {
        console.error('[store] Error reenviando query del buffer:', (err as Error)?.message ?? err)
        writeBuffer.push(item)
      }
    }
    if (flushed > 0) {
      try { saveDb() } catch { /* se reintentará */ }
      dbAvailable = true
    }
    if (flushed > 0) console.log(`[store] Buffer flush: ${flushed} queries recuperadas`)
  }, 15_000)
}

function run(sql: string, params: unknown[] = []) {
  if (!dbAvailable) {
    writeBuffer.push({ sql, params })
    return
  }
  try {
    db().run(sql, params)
  } catch (err) {
    console.error('[store] Error ejecutando query:', (err as Error)?.message ?? err, sql.slice(0, 80))
    dbAvailable = false
    writeBuffer.push({ sql, params })
    startBufferFlush()
    throw err
  }
  try {
    saveDb()
  } catch (err) {
    console.warn('[store] Error en saveDb:', (err as Error)?.message ?? err)
    setTimeout(() => {
      try { saveDb() } catch { /* próximo ciclo */ }
    }, 500)
  }
}

function runSafe(sql: string, params: unknown[] = []): { ok: boolean; error?: string } {
  try {
    run(sql, params)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error)?.message ?? 'desconocido' }
  }
}

function get<T>(sql: string, params: unknown[] = []): T | undefined {
  try {
    const stmt = db().prepare(sql)
    if (params.length) stmt.bind(params)
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as T
      stmt.free()
      return row
    }
    stmt.free()
    return undefined
  } catch (err) {
    console.error('[store] Error en get:', (err as Error)?.message ?? err, sql.slice(0, 80))
    return undefined
  }
}

function all<T>(sql: string, params: unknown[] = []): T[] {
  try {
    const stmt = db().prepare(sql)
    if (params.length) stmt.bind(params)
    const results: T[] = []
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T)
    }
    stmt.free()
    return results
  } catch (err) {
    console.error('[store] Error en all:', (err as Error)?.message ?? err, sql.slice(0, 80))
    return []
  }
}

export interface Lead {
  id: string
  name: string
  dni: string
  phone: string
  email: string
  programInterest: string | null
  status: 'nuevo' | 'contactado'
  dealStage?: string
  classificationJson?: string
  createdAt: string
}

export const leads = {
  create(data: Omit<Lead, 'id' | 'status' | 'dealStage' | 'classificationJson' | 'createdAt'>): Lead {
    const lead: Lead = {
      ...data,
      id: randomUUID(),
      status: 'nuevo',
      dealStage: undefined,
      classificationJson: undefined,
      createdAt: new Date().toISOString(),
    }
    const result = runSafe(`INSERT INTO leads (id, name, dni, phone, email, program_interest, status, deal_stage, classification_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      lead.id, lead.name, lead.dni, lead.phone, lead.email,
      lead.programInterest ?? null, lead.status,
      lead.dealStage ?? null, lead.classificationJson ?? null, lead.createdAt,
    ])
    if (!result.ok) {
      console.error('[store] Error creando lead:', result.error)
    }
    return lead
  },

  upsert(phone: string, data: Partial<Pick<Lead, 'name' | 'dni' | 'phone' | 'email' | 'programInterest'>>): Lead {
    const existing = get<Lead>('SELECT * FROM leads WHERE phone = ?', [phone])
    if (existing) {
      const updates: string[] = []
      const values: unknown[] = []
      if (data.name) { updates.push('name = ?'); values.push(data.name) }
      if (data.dni) { updates.push('dni = ?'); values.push(data.dni) }
      if (data.email) { updates.push('email = ?'); values.push(data.email) }
      if (data.programInterest !== undefined) { updates.push('program_interest = ?'); values.push(data.programInterest) }
      if (updates.length > 0) {
        runSafe(`UPDATE leads SET ${updates.join(', ')} WHERE phone = ?`, [...values, phone])
      }
      return get<Lead>('SELECT * FROM leads WHERE phone = ?', [phone])!
    }
    return leads.create({
      name: data.name ?? phone,
      dni: data.dni ?? '',
      phone,
      email: data.email ?? '',
      programInterest: data.programInterest ?? null,
    })
  },

  updateClassification(id: string, dealStage: string, classificationJson: string) {
    runSafe('UPDATE leads SET deal_stage = ?, classification_json = ? WHERE id = ?', [dealStage, classificationJson, id])
  },

  getByPhone(phone: string): Lead | undefined {
    return get<Lead>('SELECT * FROM leads WHERE phone = ?', [phone])
  },

  getAll(): Lead[] {
    return all<Lead>('SELECT * FROM leads ORDER BY created_at DESC', [])
  },
}

export type ChatMode = 'AI' | 'HUMAN'

export const dashboard = {
  addMessage(phone: string, role: 'user' | 'assistant' | 'human', content: string, name?: string, meta?: string) {
    const ts = new Date().toISOString()
    runSafe('INSERT INTO dashboard_messages (phone, name, role, content, ts, metadata) VALUES (?, ?, ?, ?, ?, ?)', [phone, name ?? null, role, content, ts, meta ?? null])
    runSafe(`INSERT INTO dashboard_meta (phone, name, mode, last_activity) VALUES (?, ?, 'AI', ?)
      ON CONFLICT(phone) DO UPDATE SET name = excluded.name, last_activity = excluded.last_activity`, [phone, name ?? null, ts])
    runSafe(`DELETE FROM dashboard_messages WHERE phone = ? AND id NOT IN (
      SELECT id FROM dashboard_messages WHERE phone = ? ORDER BY ts DESC LIMIT 200)`, [phone, phone])
  },

  setMode(phone: string, mode: ChatMode) {
    const ts = new Date().toISOString()
    runSafe(`INSERT INTO dashboard_meta (phone, name, mode, last_activity) VALUES (?, ?, ?, ?)
      ON CONFLICT(phone) DO UPDATE SET mode = excluded.mode, last_activity = excluded.last_activity`, [phone, phone, mode, ts])
  },

  getMode(phone: string): ChatMode {
    const row = get<{ mode: ChatMode }>('SELECT mode FROM dashboard_meta WHERE phone = ?', [phone])
    return row?.mode ?? 'AI'
  },

  setName(phone: string, name: string) {
    runSafe('UPDATE dashboard_meta SET name = ?, last_activity = ? WHERE phone = ?', [name, new Date().toISOString(), phone])
  },

  getAll() {
    const metaRows = all<{ phone: string; name: string | null; mode: ChatMode; last_activity: string }>(
      'SELECT * FROM dashboard_meta ORDER BY last_activity DESC', [])

    return metaRows.map(meta => {
      const messages = all<{ role: string; content: string; ts: string }>(
        'SELECT role, content, ts FROM dashboard_messages WHERE phone = ? ORDER BY ts ASC LIMIT 200', [meta.phone])
      return {
        phone: meta.phone,
        name: meta.name ?? meta.phone,
        mode: meta.mode,
        lastActivity: meta.last_activity,
        messages: messages.map(m => ({ role: m.role, content: m.content, ts: m.ts })),
      }
    })
  },
}

const AI_HISTORY_LIMIT = 20

export const aiStore = {
  addMessage(phone: string, role: 'user' | 'assistant', content: string) {
    runSafe('INSERT INTO ai_history (phone, role, content, created_at) VALUES (?, ?, ?, ?)', [phone, role, content, new Date().toISOString()])
    runSafe(`DELETE FROM ai_history WHERE phone = ? AND rowid NOT IN (
      SELECT rowid FROM ai_history WHERE phone = ? ORDER BY created_at DESC LIMIT ?)`, [phone, phone, AI_HISTORY_LIMIT])
  },

  getHistory(phone: string): Array<{ role: string; content: string }> {
    return all<{ role: string; content: string }>(
      'SELECT role, content FROM ai_history WHERE phone = ? ORDER BY created_at ASC LIMIT ?', [phone, AI_HISTORY_LIMIT])
  },

  clearHistory(phone: string) {
    runSafe('DELETE FROM ai_history WHERE phone = ?', [phone])
  },
}

export interface OutboxEvent {
  event: string
  payload: Record<string, unknown>
}

export const outbox = {
  enqueue(event: string, payload: Record<string, unknown>) {
    runSafe('INSERT INTO outbox (event, payload, created_at) VALUES (?, ?, ?)', [event, JSON.stringify(payload), new Date().toISOString()])
  },

  getPending(limit = 10) {
    const now = new Date().toISOString()
    return all<{ id: number; event: string; payload: string; attempts: number }>(
      "SELECT * FROM outbox WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= ?) ORDER BY created_at ASC LIMIT ?",
      [now, limit])
  },

  markSent(id: number) {
    runSafe('UPDATE outbox SET status = ?, sent_at = ? WHERE id = ?', ['sent', new Date().toISOString(), id])
  },

  markFailed(id: number) {
    const BACKOFF_SECONDS = [30, 120, 600, 3600, 21600]
    const row = get<{ attempts: number }>('SELECT attempts FROM outbox WHERE id = ?', [id])
    const nextAttempts = (row?.attempts ?? 0) + 1
    const delayIdx = Math.min(nextAttempts - 1, BACKOFF_SECONDS.length - 1)
    const nextRetry = new Date(Date.now() + BACKOFF_SECONDS[delayIdx] * 1000).toISOString()
    const isDead = nextAttempts >= 5
    runSafe(`UPDATE outbox SET attempts = ?, status = ?, next_retry_at = ? WHERE id = ?`,
      [nextAttempts, isDead ? 'failed' : 'pending', isDead ? null : nextRetry, id])
  },
}

export const knowledgeQueries = {
  record(query: string, normalized: string, source: string | null) {
    runSafe('INSERT INTO knowledge_queries (query, normalized, matched_source, created_at) VALUES (?, ?, ?, ?)',
      [query, normalized, source, new Date().toISOString()])
  },
}

export const geminiUsage = {
  track(success: boolean) {
    const today = new Date().toISOString().slice(0, 10)
    if (success) {
      runSafe(`INSERT INTO gemini_usage (date, requests, tokens, errors) VALUES (?, 1, 0, 0)
        ON CONFLICT(date) DO UPDATE SET requests = requests + 1`, [today])
    } else {
      runSafe(`INSERT INTO gemini_usage (date, requests, tokens, errors) VALUES (?, 0, 0, 1)
        ON CONFLICT(date) DO UPDATE SET errors = errors + 1`, [today])
    }
  },
}

export function getWriteBufferSize(): number {
  return writeBuffer.length
}

export function stopBufferFlush() {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
}
