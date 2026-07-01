import { getDb, saveDb, isDbHealthy } from '../database/sqlite.js'
import { normalizeLeadId } from './lead-id.js'
import { child } from '../logger.js'
const log = child('ctx')

interface ConversationData {
  lastProgramShown?: string
  lastQuestions: string[]
  hostilityCount: number
  loopCount: number
  lastResponse: string
  currentFlow?: string
  lastPrompt?: string
}

// Cache LRU en memoria para evitar queries SQLite repetidos
const cacheTTL = 5 * 60 * 1000
interface CacheEntry {
  data: ConversationData
  ts: number
}
const memoryCache = new Map<string, CacheEntry>()
let cacheHits = 0
let cacheMisses = 0

function cacheKey(phone: string): string {
  return normalizeLeadId(phone)
}

function getFromCache(phone: string): ConversationData | null {
  const key = cacheKey(phone)
  const entry = memoryCache.get(key)
  if (entry && Date.now() - entry.ts < cacheTTL) {
    cacheHits++
    return entry.data
  }
  if (entry) {
    memoryCache.delete(key)
  }
  cacheMisses++
  return null
}

function setCache(phone: string, data: ConversationData): void {
  const key = cacheKey(phone)
  memoryCache.set(key, { data, ts: Date.now() })
}

function invalidateCache(phone: string): void {
  memoryCache.delete(cacheKey(phone))
}

export const conversationContext = {
  get(phone: string): ConversationData {
    const cached = getFromCache(phone)
    if (cached) return cached

    try {
      if (!isDbHealthy()) {
        return { lastQuestions: [], hostilityCount: 0, loopCount: 0, lastResponse: '' }
      }

      const normalized = normalizeLeadId(phone)
      const stmt = getDb().prepare('SELECT data_json FROM conv_state WHERE phone = ?')
      stmt.bind([normalized])
      if (stmt.step()) {
        const row = stmt.getAsObject() as { data_json: string }
        stmt.free()
        const data = JSON.parse(row.data_json) as ConversationData
        setCache(phone, data)
        return data
      }
      stmt.free()
    } catch (err) {
      log.error('Error obteniendo contexto: %s', (err as Error)?.message ?? err)
    }

    const defaultData = { lastQuestions: [], hostilityCount: 0, loopCount: 0, lastResponse: '' }
    setCache(phone, defaultData)
    return defaultData
  },

  set(phone: string, data: Partial<ConversationData>) {
    const current = this.get(phone)
    const merged = { ...current, ...data }
    setCache(phone, merged)

    try {
      if (!isDbHealthy()) {
        log.warn('DB no disponible. Contexto solo en memoria para %s', phone)
        return
      }

      const normalized = normalizeLeadId(phone)
      getDb().run(`INSERT INTO conv_state (phone, state, data_json, updated_at) VALUES (?, 'IDLE', ?, ?)
        ON CONFLICT(phone) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`,
        [normalized, JSON.stringify(merged), new Date().toISOString()])
      saveDb()
    } catch (err) {
      log.error('Error guardando contexto: %s', (err as Error)?.message ?? err)
    }
  },

  recordQuestion(phone: string, question: string) {
    const ctx = this.get(phone)
    ctx.lastQuestions.push(question)
    if (ctx.lastQuestions.length > 5) ctx.lastQuestions.shift()
    this.set(phone, ctx)
  },

  recordProgram(phone: string, programName: string) {
    this.set(phone, { lastProgramShown: programName })
  },

  recordHostility(phone: string): number {
    const ctx = this.get(phone)
    ctx.hostilityCount++
    this.set(phone, ctx)
    return ctx.hostilityCount
  },

  recordLoop(phone: string, response: string): boolean {
    const ctx = this.get(phone)
    if (ctx.lastResponse === response) {
      ctx.loopCount++
    } else {
      ctx.loopCount = 0
    }
    ctx.lastResponse = response
    this.set(phone, ctx)
    return ctx.loopCount >= 3
  },

  reset(phone: string) {
    invalidateCache(phone)
    try {
      if (!isDbHealthy()) return
      const normalized = normalizeLeadId(phone)
      getDb().run('DELETE FROM conv_state WHERE phone = ?', [normalized])
      saveDb()
    } catch (err) {
      log.error('Error reseteando contexto: %s', (err as Error)?.message ?? err)
    }
  },

  isFrustrated(phone: string): boolean {
    const ctx = this.get(phone)
    return ctx.hostilityCount >= 3 || ctx.loopCount >= 3
  },

  recordFlowPosition(phone: string, flow: string, prompt: string) {
    this.set(phone, { currentFlow: flow, lastPrompt: prompt })
  },

  getCacheStats() {
    return { hits: cacheHits, misses: cacheMisses, size: memoryCache.size }
  },
}
