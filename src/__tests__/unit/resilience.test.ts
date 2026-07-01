import { describe, it, expect, beforeEach } from 'vitest'
import { getDb, saveDb, closeDb, initDb, verifyDbHealth, isDbHealthy } from '../../database/sqlite.js'
import { existsSync, unlinkSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const DB_PATH = join(process.cwd(), 'data', 'cee.db')
const DB_BACKUP_PATH = join(process.cwd(), 'data', 'cee.db.bak')

// ==================== DB Recovery ====================
describe('DB recovery', () => {
  beforeEach(() => {
    closeDb()
    try { unlinkSync(DB_PATH) } catch { /* ok */ }
    try { unlinkSync(DB_BACKUP_PATH) } catch { /* ok */ }
  })

  it('initDb crea BD y backup', async () => {
    const db = await initDb()
    expect(db).toBeDefined()
    expect(existsSync(DB_PATH)).toBe(true)
    expect(existsSync(DB_BACKUP_PATH)).toBe(true)
    expect(isDbHealthy()).toBe(true)
  })

  it('verifyDbHealth retorna healthy tras init', async () => {
    await initDb()
    const result = verifyDbHealth()
    expect(result.healthy).toBe(true)
    expect(result.details).toBe('ok')
  })

  it('initDb reutiliza conexion existente', async () => {
    const db1 = await initDb()
    const db2 = await initDb()
    expect(db1).toBe(db2)
  })

  it('saveDb persiste datos', async () => {
    await initDb()
    const db = getDb()
    db.run("CREATE TABLE IF NOT EXISTS _test (id INTEGER)")
    db.run("INSERT INTO _test VALUES (42)")
    saveDb()

    const { readFileSync } = await import('node:fs')
    const buf = readFileSync(DB_PATH)
    expect(buf.length).toBeGreaterThan(100)
  })

  it('getDb lanza si no inicializada', () => {
    closeDb()
    expect(() => getDb()).toThrow('Database not initialized')
  })

  it('isDbHealthy retorna false si no inicializada', () => {
    closeDb()
    expect(isDbHealthy()).toBe(false)
  })

  it('closeDb cierra correctamente', async () => {
    await initDb()
    closeDb()
    expect(isDbHealthy()).toBe(false)
    expect(() => getDb()).toThrow()
  })
})

// ==================== Conversation Context Cache ====================
describe('conversation-context cache', () => {
  beforeEach(async () => {
    closeDb()
    try { unlinkSync(DB_PATH) } catch { /* ok */ }
    try { unlinkSync(DB_BACKUP_PATH) } catch { /* ok */ }
    await initDb()
  })

  it('get devuelve default en cache miss', async () => {
    const { conversationContext } = await import('../../services/conversation-context.js')
    conversationContext.reset('51999999999')
    const ctx = conversationContext.get('51999999999')
    expect(ctx).toBeDefined()
    expect(ctx.hostilityCount).toBe(0)
    expect(ctx.loopCount).toBe(0)
    expect(ctx.lastQuestions).toEqual([])
  })

  it('set y get via cache', async () => {
    const { conversationContext } = await import('../../services/conversation-context.js')
    conversationContext.reset('51999999999')
    conversationContext.set('51999999999', { hostilityCount: 2 })
    const ctx = conversationContext.get('51999999999')
    expect(ctx.hostilityCount).toBe(2)
  })

  it('recordHostility incrementa contador', async () => {
    const { conversationContext } = await import('../../services/conversation-context.js')
    conversationContext.reset('51999999998')
    const count1 = conversationContext.recordHostility('51999999998')
    expect(count1).toBe(1)
    const count2 = conversationContext.recordHostility('51999999998')
    expect(count2).toBe(2)
    const count3 = conversationContext.recordHostility('51999999998')
    expect(count3).toBe(3)
    expect(conversationContext.isFrustrated('51999999998')).toBe(true)
  })

  it('recordLoop detecta 3 repeticiones', async () => {
    const { conversationContext } = await import('../../services/conversation-context.js')
    const isLoop1 = conversationContext.recordLoop('51999999999', 'Hola')
    expect(isLoop1).toBe(false)
    const isLoop2 = conversationContext.recordLoop('51999999999', 'Hola')
    expect(isLoop2).toBe(false)
    const isLoop3 = conversationContext.recordLoop('51999999999', 'Hola')
    expect(isLoop3).toBe(false)
    const isLoop4 = conversationContext.recordLoop('51999999999', 'Hola')
    expect(isLoop4).toBe(true)
  })

  it('reset limpia estado', async () => {
    const { conversationContext } = await import('../../services/conversation-context.js')
    conversationContext.recordHostility('51999999999')
    conversationContext.reset('51999999999')
    const ctx = conversationContext.get('51999999999')
    expect(ctx.hostilityCount).toBe(0)
  })

  it('getCacheStats tiene hits tras lecturas repetidas', async () => {
    const { conversationContext } = await import('../../services/conversation-context.js')
    conversationContext.set('51999999999', { hostilityCount: 1 })
    conversationContext.get('51999999999')
    conversationContext.get('51999999999')
    const stats = conversationContext.getCacheStats()
    expect(stats.hits).toBeGreaterThanOrEqual(1)
    expect(stats.size).toBeGreaterThanOrEqual(1)
  })
})

// ==================== Message Aggregator ====================
describe('message-aggregator shutdown', () => {
  it('dropAll limpia buffers sin errores', async () => {
    const { dropAll, waitForBurst } = await import('../../services/message-aggregator.js')
    process.env.ENABLE_MESSAGE_AGGREGATOR = 'true'

    // Crear un burst sin resolver
    void waitForBurst('51999', 'test1')
    void waitForBurst('51998', 'test2')

    // dropAll no debe lanzar
    expect(() => dropAll()).not.toThrow()

    delete process.env.ENABLE_MESSAGE_AGGREGATOR
  })

  it('waitForBurst resuelve con null cuando es cancelado', async () => {
    const { waitForBurst } = await import('../../services/message-aggregator.js')
    process.env.ENABLE_MESSAGE_AGGREGATOR = 'true'

    // Primer mensaje
    const p1 = waitForBurst('51999', 'msg1')
    // Segundo mensaje reemplaza al primero
    const p2 = waitForBurst('51999', 'msg2')

    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1).toBeNull()
    expect(r2).not.toBeNull()
    expect(r2).toContain('msg1')

    delete process.env.ENABLE_MESSAGE_AGGREGATOR
  })

  it('CRITICAL_COMMANDS fuerza flush inmediato', async () => {
    const { waitForBurst } = await import('../../services/message-aggregator.js')
    process.env.ENABLE_MESSAGE_AGGREGATOR = 'true'

    // Encolar un mensaje y luego 'cancelar' — cancelar debe resolverse inmediatamente
    void waitForBurst('51999', 'hola')
    const result = await waitForBurst('51999', 'cancelar')
    expect(result).toBe('cancelar')

    delete process.env.ENABLE_MESSAGE_AGGREGATOR
  })

  it('isEnabled respeta variable de entorno', async () => {
    const { isEnabled } = await import('../../services/message-aggregator.js')
    process.env.ENABLE_MESSAGE_AGGREGATOR = 'false'
    expect(isEnabled()).toBe(false)

    process.env.ENABLE_MESSAGE_AGGREGATOR = 'true'
    expect(isEnabled()).toBe(true)

    delete process.env.ENABLE_MESSAGE_AGGREGATOR
    expect(isEnabled()).toBe(true) // default
  })
})

// ==================== RAG health ====================
describe('RAG health', () => {
  it('rag module es importable', async () => {
    const { rag } = await import('../../services/rag/index.js')
    expect(rag).toBeDefined()
    expect(typeof rag.retrieve).toBe('function')
    expect(typeof rag.formatResponse).toBe('function')
  })

  it('getHealth existe como metodo', async () => {
    const { rag } = await import('../../services/rag/index.js')
    const health = rag.getHealth()
    expect(health).toBeDefined()
    expect(typeof health.available).toBe('boolean')
  })
})

// ==================== Moderation Set ====================
describe('moderation', () => {
  it('check detecta palabras bloqueadas', async () => {
    const { moderation } = await import('../../services/moderation.js')
    const result = moderation.check('eres un idiota')
    expect(result.blocked).toBe(true)
    expect(result.response).toBeTruthy()
  })

  it('check no bloquea mensajes normales', async () => {
    const { moderation } = await import('../../services/moderation.js')
    const result = moderation.check('Hola, quiero información de los programas')
    expect(result.blocked).toBe(false)
  })

  it('check detecta palabra suelta entre espacios', async () => {
    const { moderation } = await import('../../services/moderation.js')
    const result = moderation.check('me interesa pero no seas mierda')
    expect(result.blocked).toBe(true)
  })

  it('shouldEscalate con 2+ hostilidades', async () => {
    const { moderation } = await import('../../services/moderation.js')
    expect(moderation.shouldEscalate(2, 0)).toBe(true)
    expect(moderation.shouldEscalate(1, 0)).toBe(false)
  })

  it('shouldEscalate con 3+ loops', async () => {
    const { moderation } = await import('../../services/moderation.js')
    expect(moderation.shouldEscalate(0, 3)).toBe(true)
    expect(moderation.shouldEscalate(0, 2)).toBe(false)
  })
})

// ==================== Store ====================
describe('store operations', () => {
  beforeEach(async () => {
    closeDb()
    try { unlinkSync(DB_PATH) } catch { /* ok */ }
    try { unlinkSync(DB_BACKUP_PATH) } catch { /* ok */ }
    await initDb()
  })

  it('leads.create inserta y retorna lead', async () => {
    const { leads } = await import('../../services/store.js')
    const lead = leads.create({
      name: 'Test User',
      dni: '12345678',
      phone: '51999999999',
      email: 'test@test.com',
      programInterest: null,
    })
    expect(lead.id).toBeDefined()
    expect(lead.name).toBe('Test User')
    expect(lead.status).toBe('nuevo')
  })

  it('leads.upsert no duplica', async () => {
    const { leads } = await import('../../services/store.js')
    const lead1 = leads.upsert('51999999999', { name: 'User1', dni: '12345678', email: 'a@a.com' })
    const lead2 = leads.upsert('51999999999', { name: 'User2', dni: '87654321', email: 'b@b.com' })
    expect(lead1.id).toBe(lead2.id)
    expect(lead2.name).toBe('User2')
    expect(lead2.dni).toBe('87654321')
  })

  it('leads.getByPhone encuentra lead existente', async () => {
    const { leads } = await import('../../services/store.js')
    leads.create({ name: 'Find Me', dni: '11111111', phone: '51999999999', email: 'f@f.com', programInterest: null })
    const found = leads.getByPhone('51999999999')
    expect(found).toBeDefined()
    expect(found!.name).toBe('Find Me')
  })

  it('outbox.enqueue agrega evento pendiente', async () => {
    const { outbox } = await import('../../services/store.js')
    outbox.enqueue('test.event', { data: 'hello' })
    const pending = outbox.getPending(10)
    expect(pending.length).toBe(1)
    expect(pending[0].event).toBe('test.event')
  })

  it('outbox.markSent y markFailed actualizan estado', async () => {
    const { outbox } = await import('../../services/store.js')
    outbox.enqueue('test.sent', {})
    const [ev] = outbox.getPending(10)
    outbox.markSent(ev.id)
    expect(outbox.getPending(10).length).toBe(0)

    outbox.enqueue('test.fail', {})
    const [ev2] = outbox.getPending(10)
    outbox.markFailed(ev2.id)
    // Después de markFailed con 1 intento, tiene next_retry_at en 30s futuro → no pending
    expect(outbox.getPending(10).length).toBe(0)
  })

  it('dashboard addMessage y getAll', async () => {
    const { dashboard } = await import('../../services/store.js')
    dashboard.addMessage('51999999999', 'user', 'Hola')
    dashboard.addMessage('51999999999', 'assistant', 'Buenos días')
    const all = dashboard.getAll()
    expect(all.length).toBe(1)
    expect(all[0].phone).toBe('51999999999')
    expect(all[0].messages.length).toBe(2)
  })

  it('dashboard setMode y getMode', async () => {
    const { dashboard } = await import('../../services/store.js')
    dashboard.setMode('51999999999', 'HUMAN')
    expect(dashboard.getMode('51999999999')).toBe('HUMAN')
    dashboard.setMode('51999999999', 'AI')
    expect(dashboard.getMode('51999999999')).toBe('AI')
  })

  it('aiStore addMessage respeta limite de historial', async () => {
    const { aiStore } = await import('../../services/store.js')
    for (let i = 0; i < 25; i++) {
      aiStore.addMessage('51999999999', i % 2 === 0 ? 'user' : 'assistant', `msg${i}`)
    }
    const history = aiStore.getHistory('51999999999')
    expect(history.length).toBeLessThanOrEqual(20) // AI_HISTORY_LIMIT
  })

  it('aiStore clearHistory vacia registros', async () => {
    const { aiStore } = await import('../../services/store.js')
    aiStore.addMessage('51999999999', 'user', 'test')
    aiStore.clearHistory('51999999999')
    expect(aiStore.getHistory('51999999999').length).toBe(0)
  })

  it('knowledgeQueries record no lanza', async () => {
    const { knowledgeQueries } = await import('../../services/store.js')
    expect(() => knowledgeQueries.record('query', 'normalized', 'static')).not.toThrow()
  })
})

// ==================== Normalizer ====================
describe('normalizer', () => {
  it('normalizeQuery limpia texto', async () => {
    const { normalizeQuery } = await import('../../services/normalizer.js')
    expect(normalizeQuery('  Hola   Mundo  ')).toBe('hola mundo')
    expect(normalizeQuery('¿Cuánto cuesta?')).toBe('cuanto cuesta')
  })
})

// ==================== utils ====================
describe('utils', () => {
  it('rnd retorna entre 500 y 1300', async () => {
    const { rnd } = await import('../../utils.js')
    for (let i = 0; i < 20; i++) {
      const v = rnd()
      expect(v).toBeGreaterThanOrEqual(500)
      expect(v).toBeLessThanOrEqual(1300)
    }
  })

  it('splitResponse maneja string vacío', async () => {
    const { splitResponse } = await import('../../utils.js')
    expect(splitResponse('')).toEqual([])
    expect(splitResponse('   ')).toEqual([])
    expect(splitResponse('Hola')).toEqual(['Hola'])
  })

  it('splitResponse divide textos largos con parrafos', async () => {
    const { splitResponse } = await import('../../utils.js')
    const long = 'A'.repeat(200) + '\n\n' + 'B'.repeat(200)
    const parts = splitResponse(long, 100)
    expect(parts.length).toBeGreaterThanOrEqual(1)
    for (const p of parts) {
      expect(p.length).toBeGreaterThan(0)
    }
  })
})

// ==================== Office Hours ====================
describe('office-hours', () => {
  it('isOpen no lanza con fecha arbitraria', async () => {
    const { isOpen } = await import('../../services/office-hours.js')
    const now = new Date()
    const result = isOpen(now)
    expect(typeof result).toBe('boolean')
  })
})
