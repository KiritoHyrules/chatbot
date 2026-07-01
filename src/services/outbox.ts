import { createHmac } from 'node:crypto'
import { outbox as outboxStore } from './store.js'
import { getWriteBufferSize } from './store.js'

export function signPayload(body: string): string | null {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) return null
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

// Circuit breaker para n8n
let n8nFailures = 0
let n8nFailureWindow = 0
let n8nCooldownUntil = 0
const N8N_MAX_FAILURES = 3
const N8N_FAILURE_WINDOW_MS = 120_000
const N8N_COOLDOWN_MS = 300_000
const FETCH_TIMEOUT_MS = 15_000

function isN8nCircuitOpen(): boolean {
  if (n8nCooldownUntil > Date.now()) return true
  if (n8nFailureWindow && Date.now() - n8nFailureWindow > N8N_FAILURE_WINDOW_MS) {
    n8nFailures = 0
    n8nFailureWindow = 0
  }
  return false
}

function recordN8nFailure(): void {
  const now = Date.now()
  if (!n8nFailureWindow || now - n8nFailureWindow > N8N_FAILURE_WINDOW_MS) {
    n8nFailures = 1
    n8nFailureWindow = now
  } else {
    n8nFailures++
  }
  if (n8nFailures >= N8N_MAX_FAILURES) {
    n8nCooldownUntil = now + N8N_COOLDOWN_MS
    console.error(`[OUTBOX] Circuito abierto por ${N8N_COOLDOWN_MS / 1000}s tras ${N8N_MAX_FAILURES} fallos`)
  }
}

function recordN8nSuccess(): void {
  n8nFailures = 0
  n8nFailureWindow = 0
  n8nCooldownUntil = 0
}

let interval: ReturnType<typeof setInterval> | null = null
let consecutiveErrors = 0
let totalSent = 0
let totalFailed = 0
let pendingMetric = 0

export function getOutboxMetrics() {
  return {
    pending: pendingMetric,
    totalSent,
    totalFailed,
    consecutiveErrors,
    circuitOpen: isN8nCircuitOpen(),
    writeBuffer: getWriteBufferSize(),
  }
}

export function startOutboxWorker() {
  const n8nUrl = process.env.N8N_WEBHOOK_URL
  if (!n8nUrl) {
    console.log('[OUTBOX] N8N_WEBHOOK_URL no configurado. Worker no iniciado.')
    return
  }

  console.log(`[OUTBOX] Worker iniciado → ${n8nUrl}`)

  interval = setInterval(async () => {
    if (isN8nCircuitOpen()) {
      const remaining = Math.round((n8nCooldownUntil - Date.now()) / 1000)
      if (remaining % 30 === 0) {
        console.warn(`[OUTBOX] Circuito abierto. Reintentando en ${remaining}s`)
      }
      return
    }

    const pending = outboxStore.getPending(10)
    pendingMetric = pending.length

    if (pending.length === 0) {
      consecutiveErrors = 0
      return
    }

    let sent = 0
    let failed = 0

    for (const event of pending) {
      try {
        const bodyObj = {
          event: event.event,
          timestamp: new Date().toISOString(),
          ...JSON.parse(event.payload),
        }
        const bodyStr = JSON.stringify(bodyObj)

        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        const signature = signPayload(bodyStr)
        if (signature) headers['X-CEE-Signature'] = signature

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

        const res = await fetch(n8nUrl, {
          method: 'POST',
          headers,
          body: bodyStr,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId))

        if (res.ok) {
          outboxStore.markSent(event.id)
          sent++
          totalSent++
          recordN8nSuccess()
        } else {
          outboxStore.markFailed(event.id)
          failed++
          totalFailed++
          recordN8nFailure()
        }
      } catch (err) {
        const isTimeout = (err as Error)?.name === 'AbortError'
        if (isTimeout) {
          console.warn(`[OUTBOX] Timeout (${FETCH_TIMEOUT_MS / 1000}s) enviando evento ${event.id}`)
        }
        outboxStore.markFailed(event.id)
        failed++
        totalFailed++
        recordN8nFailure()
      }
    }

    if (failed > 0 && sent === 0) {
      consecutiveErrors++
      if (consecutiveErrors >= 5) {
        console.error(`[OUTBOX] ${consecutiveErrors} ciclos consecutivos con errores. n8n puede estar caído.`)
      }
    } else if (sent > 0) {
      consecutiveErrors = 0
    }

    if (sent > 0 || failed > 0) {
      console.log(`[OUTBOX] Ciclo: ${sent} enviados, ${failed} fallidos, ${outboxStore.getPending(100).length} pendientes`)
    }
  }, 30_000)
}

export function stopOutboxWorker() {
  if (interval) {
    clearInterval(interval)
    interval = null
    console.log('[OUTBOX] Worker detenido. Total: %d enviados, %d fallidos.', totalSent, totalFailed)
  }
}
