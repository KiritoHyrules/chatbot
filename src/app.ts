import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createBot } from '@builderbot/bot'
import { child } from './logger.js'
const log = child('app')
import { flow } from './flows/index.js'
import { provider } from './provider/index.js'
import { database } from './database/index.js'
import { ai } from './services/ai.js'
import { messageLog } from './services/message-log.js'
import { dashboard } from './services/store.js'
import { leads, outbox, stopBufferFlush } from './services/store.js'
import { authGuard } from './middleware/auth.js'
import { healthCheck } from './middleware/health.js'
import { startOutboxWorker, stopOutboxWorker, getOutboxMetrics } from './services/outbox.js'
import { initDb, closeDb, verifyDbHealth, isDbHealthy } from './database/sqlite.js'
import { pipeline } from './services/pipeline.js'
import { leadScorer } from './services/lead-scorer.js'
import { objectionDetector } from './services/objection-detector.js'
import { urgencyDetector } from './services/urgency-detector.js'
import { tagEngine } from './services/tag-engine.js'
import { templates } from './services/response-templates.js'
import { decision } from './services/decision-engine.js'
import { moderation } from './services/moderation.js'
import { metrics } from './services/metrics.js'
import { intentRouter } from './services/intent-router.js'
import { conversationContext } from './services/conversation-context.js'
import { normalizeLeadId } from './services/lead-id.js'
import { setProvider, resolvePendingLids, setupLidListener } from './services/lid-resolver.js'
import { humanReply } from './services/human-presence.js'
import { waitForBurst, dropAll } from './services/message-aggregator.js'
import { setupReconnectHandler, getWhatsAppHealth } from './provider/index.js'

// Estado global
let draining = false

// Deduplicación de mensajes (persistida cada 30s)
const seenMessages = new Map<string, number>()
const DEDUP_WINDOW_MS = 10_000
const dedupCleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, ts] of seenMessages) {
    if (now - ts > DEDUP_WINDOW_MS) seenMessages.delete(key)
  }
}, 30_000)

function isDuplicate(phone: string, body: string): boolean {
  const hash = `${phone}:${body.slice(0, 100)}`
  const last = seenMessages.get(hash)
  if (last && Date.now() - last < DEDUP_WINDOW_MS) return true
  seenMessages.set(hash, Date.now())
  return false
}

// Rate limiting para dashboard
const rateLimitMap = new Map<string, { count: number; reset: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000
const RATE_LIMIT_MAX = 100

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

mkdirSync(join(process.cwd(), 'data'), { recursive: true })
mkdirSync(join(process.cwd(), 'public', 'brochures'), { recursive: true })

const PORT = +(process.env.PORT ?? 3008)
const dashPath = join(process.cwd(), 'public', 'dashboard.html')
const dashHtml = existsSync(dashPath) ? readFileSync(dashPath, 'utf8') : '<h1>Dashboard no disponible</h1><p>El archivo public/dashboard.html no existe.</p>'

// Limpieza de timers
const timers: ReturnType<typeof setInterval>[] = [dedupCleanup]

const main = async () => {
  if (!process.env.GEMINI_API_KEY) {
    log.error('GEMINI_API_KEY no está definida en .env.local')
    log.error('El FAQ y las respuestas con IA no funcionarán.')
  }

  if (!process.env.DASHBOARD_SECRET) {
    const tokenPath = join(process.cwd(), 'data', 'operator_token.txt')
    const generated = randomUUID()
    process.env.DASHBOARD_SECRET = generated
    writeFileSync(tokenPath, generated, 'utf8')
    log.warn('DASHBOARD_SECRET no definido. Token generado y guardado en: %s', tokenPath)
  }

  const humanPresence = {
    reply: (ctx: { from: string }, fd: Function, text: string | string[], opts: Record<string, unknown> = {}) =>
      humanReply(ctx, fd as (msgs: Array<{ body: string; delay: number; media?: string }>) => Promise<void>, text, { provider, ...opts }),
  }

  const { httpServer, handleCtx } = await createBot(
    { flow, provider, database },
    { extensions: { ai, messageLog, pipeline, leadScorer, objectionDetector, urgencyDetector, tagEngine, templates, decision, moderation, metrics, intentRouter, conversationContext, humanPresence, aggregator: { waitForBurst } } }
  )

  // Health check enriquecido
  provider.server.get('/health', async (_req: unknown, res: { writeHead: (c: number, h: Record<string, string>) => void; end: (s: string) => void }) => {
    const dbHealth = verifyDbHealth()
    const outboxMetrics = getOutboxMetrics()
    const waHealth = getWhatsAppHealth()
    const aiHealth = ai.getHealth()
    const ctxCache = conversationContext.getCacheStats()

    const healthy = dbHealth.healthy && waHealth.state === 'connected'

    const status = {
      status: healthy ? 'ok' : 'degraded',
      uptime: process.uptime(),
      draining,
      db: dbHealth,
      outbox: outboxMetrics,
      whatsapp: waHealth,
      ai: aiHealth,
      cache: ctxCache,
      memory: {
        dedupSize: seenMessages.size,
        rateLimitSize: rateLimitMap.size,
      },
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
      timestamp: new Date().toISOString(),
    }

    const statusCode = healthy ? 200 : 503
    res.writeHead(statusCode, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(status))
  })

  provider.server.get('/dashboard', async (_req: unknown, res: { end: (s: string) => void }) => {
    res.end(dashHtml)
  })

  provider.server.get('/api/dashboard/state', async (req: unknown, res: { writeHead: (c: number, h: Record<string, string>) => void; end: (s: string) => void }) => {
    if (!authGuard(req as { url?: string; headers?: Record<string, string> }, res)) return
    const ip = (req as Record<string, unknown>).socket ? ((req as Record<string, unknown>).socket as Record<string, unknown>).remoteAddress as string : 'unknown'
    if (!checkRateLimit(ip)) {
      res.writeHead(429, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta en 15 minutos.' }))
    }
    const conversations = dashboard.getAll()
    const outboxMetrics = getOutboxMetrics()
    const dbHealth = verifyDbHealth()
    const waHealth = getWhatsAppHealth()
    const aiHealth = ai.getHealth()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      conversations,
      system: {
        dbHealthy: dbHealth.healthy,
        draining,
        whatsapp: waHealth,
        ai: aiHealth,
        outbox: outboxMetrics,
      },
    }))
  })

  provider.server.post('/api/dashboard/mode', handleCtx(async (_bot, req: { body: { phone: string; mode: string } }, res: { writeHead: (c: number, h: Record<string, string>) => void; end: (s: string) => void }) => {
    if (!authGuard(req as unknown as { url?: string; headers?: Record<string, string> }, res)) return
    const ip = (req as Record<string, unknown>).socket ? ((req as Record<string, unknown>).socket as Record<string, unknown>).remoteAddress as string : 'unknown'
    if (!checkRateLimit(ip)) {
      res.writeHead(429, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta en 15 minutos.' }))
    }
    const { phone, mode } = req.body
    if (!phone || !mode || (mode !== 'AI' && mode !== 'HUMAN')) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'phone y mode (AI/HUMAN) son requeridos' }))
    }
    dashboard.setMode(phone, mode as 'AI' | 'HUMAN')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', phone, mode }))
  }))

  provider.server.post('/api/dashboard/send', handleCtx(async (bot, req: { body: { phone: string; message: string; name?: string } }, res: { writeHead: (c: number, h: Record<string, string>) => void; end: (s: string) => void }) => {
    if (!authGuard(req as unknown as { url?: string; headers?: Record<string, string> }, res)) return
    const ip = (req as Record<string, unknown>).socket ? ((req as Record<string, unknown>).socket as Record<string, unknown>).remoteAddress as string : 'unknown'
    if (!checkRateLimit(ip)) {
      res.writeHead(429, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta en 15 minutos.' }))
    }
    const { phone, message, name } = req.body
    if (!phone || !message) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'phone y message son requeridos' }))
    }
    const normalizedPhone = normalizeLeadId(phone)
    const phoneFormatted = phone.includes('@s.whatsapp.net') ? phone : `${normalizedPhone}@s.whatsapp.net`
    await bot.sendMessage(phoneFormatted, message, {})
    messageLog.human(normalizedPhone, name ?? 'Operador', message)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'sent' }))
  }))

  provider.server.post('/api/dashboard/reclassify', handleCtx(async (_bot, req: { body: { phone: string; dealStage: string; justification?: string } }, res: { writeHead: (c: number, h: Record<string, string>) => void; end: (s: string) => void }) => {
    if (!authGuard(req as unknown as { url?: string; headers?: Record<string, string> }, res)) return
    const { phone, dealStage, justification } = req.body
    if (!phone || !dealStage) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'phone y dealStage son requeridos' }))
    }
    const normalized = normalizeLeadId(phone)
    const lead = leads.getByPhone(normalized)
    if (!lead) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Lead no encontrado' }))
    }
    const classification = JSON.stringify({
      etapa_asignada: dealStage,
      confianza_analisis: 'ALTA',
      justificacion_corta: justification ?? 'Reclasificación manual desde dashboard.',
    })
    leads.updateClassification(lead.id, dealStage, classification)
    outbox.enqueue('lead.reclassified', {
      lead: { id: lead.id, phone: normalized, name: lead.name, programInterest: lead.programInterest, status: lead.status },
      dealStage,
      justification: justification ?? 'Reclasificación manual',
      manual_override: true,
    })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', lead: lead.id, dealStage }))
  }))

  await initDb()
  setupReconnectHandler()

  setProvider(provider)
  void resolvePendingLids().then(n => {
    if (n > 0) log.info('%d LIDs resueltos en startup.', n)
  })
  void setupLidListener()

  startOutboxWorker()
  httpServer(PORT)
}

const shutdown = async (signal: string) => {
  log.info('Recibido %s. Iniciando apagado graceful...', signal)
  draining = true

  // 1. Limpiar buffers de mensajes pendientes
  dropAll()
  log.info('Buffers de mensajes limpiados.')

  // 2. Esperar que mensajes en vuelo terminen
  await new Promise(r => setTimeout(r, 3000))
  log.info('3s de drenaje completados.')

  // 3. Detener workers
  stopOutboxWorker()
  stopBufferFlush()

  // 4. Limpiar timers globales
  for (const timer of timers) {
    clearInterval(timer)
  }

  // 5. Verificar integridad final y cerrar DB
  const finalHealth = verifyDbHealth()
  log.info('DB health final: %s', finalHealth.healthy ? 'ok' : 'degraded: ' + finalHealth.details)
  closeDb()

  log.info('Apagado completado.')
  process.exit(0)
}

process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('SIGINT', () => { void shutdown('SIGINT') })
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection: %s', reason)
})
process.on('uncaughtException', (err) => {
  log.error('Uncaught exception: %s', err.message)
  if (!draining) {
    draining = true
    stopOutboxWorker()
    stopBufferFlush()
    closeDb()
    process.exit(1)
  }
})

main().catch(err => {
  log.error('Error fatal: %s', err?.message ?? err)
  stopOutboxWorker()
  stopBufferFlush()
  closeDb()
  process.exit(1)
})
