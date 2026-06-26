import { getDb, saveDb } from '../database/sqlite.js'

interface ConversationData {
  lastProgramShown?: string
  lastQuestions: string[]
  hostilityCount: number
  loopCount: number
  lastResponse: string
}

export const conversationContext = {
  get(phone: string): ConversationData {
    const cleanPhone = phone.replace('@s.whatsapp.net', '')
    const stmt = getDb().prepare('SELECT data_json FROM conv_state WHERE phone = ?')
    stmt.bind([cleanPhone])
    if (stmt.step()) {
      const row = stmt.getAsObject() as { data_json: string }
      stmt.free()
      try { return JSON.parse(row.data_json) } catch { /* corrupto, usar default */ }
    }
    stmt.free()
    return { lastQuestions: [], hostilityCount: 0, loopCount: 0, lastResponse: '' }
  },

  set(phone: string, data: Partial<ConversationData>) {
    const cleanPhone = phone.replace('@s.whatsapp.net', '')
    const current = this.get(phone)
    const merged = { ...current, ...data }

    getDb().run(`INSERT INTO conv_state (phone, state, data_json, updated_at) VALUES (?, 'IDLE', ?, ?)
      ON CONFLICT(phone) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`,
      [cleanPhone, JSON.stringify(merged), new Date().toISOString()])
    saveDb()
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

  recordHostility(phone: string): boolean {
    const ctx = this.get(phone)
    ctx.hostilityCount++
    this.set(phone, ctx)
    return ctx.hostilityCount >= 3
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
    const cleanPhone = phone.replace('@s.whatsapp.net', '')
    getDb().run('DELETE FROM conv_state WHERE phone = ?', [cleanPhone])
    saveDb()
  },

  isFrustrated(phone: string): boolean {
    const ctx = this.get(phone)
    return ctx.hostilityCount >= 3 || ctx.loopCount >= 3
  },
}
