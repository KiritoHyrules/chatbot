import { createHmac } from 'node:crypto'
import { outbox as outboxStore } from './store.js'

export function signPayload(body: string): string | null {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) return null
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

let interval: ReturnType<typeof setInterval> | null = null

export function startOutboxWorker() {
  const n8nUrl = process.env.N8N_WEBHOOK_URL
  if (!n8nUrl) {
    console.log('[OUTBOX] N8N_WEBHOOK_URL no configurado. Worker no iniciado.')
    return
  }

  console.log(`[OUTBOX] Worker iniciado → ${n8nUrl}`)

  interval = setInterval(async () => {
    const pending = outboxStore.getPending(10)
    for (const event of pending) {
      try {
        const bodyStr = JSON.stringify({
          event: event.event,
          timestamp: new Date().toISOString(),
          ...JSON.parse(event.payload),
        })

        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        const signature = signPayload(bodyStr)
        if (signature) headers['X-CEE-Signature'] = signature

        const res = await fetch(n8nUrl, {
          method: 'POST',
          headers,
          body: bodyStr,
        })
        if (res.ok) {
          outboxStore.markSent(event.id)
        } else {
          outboxStore.markFailed(event.id)
        }
      } catch {
        outboxStore.markFailed(event.id)
      }
    }
  }, 30_000)
}

export function stopOutboxWorker() {
  if (interval) {
    clearInterval(interval)
    interval = null
    console.log('[OUTBOX] Worker detenido.')
  }
}
