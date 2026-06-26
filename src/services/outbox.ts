import { outbox as outboxStore } from './store.js'

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
        const res = await fetch(n8nUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: event.event,
            timestamp: new Date().toISOString(),
            ...JSON.parse(event.payload),
          }),
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
