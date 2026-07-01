import { rnd, delayBetween } from '../utils.js'

interface ReplyOptions {
  provider?: { vendor?: { sendPresenceUpdate?: (jid: string, presence: string) => Promise<void> } }
  delay?: number
  media?: string
  decisionTrace?: string
  _messageLog?: { outgoing: (phone: string, message: string, meta?: string) => void }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function toJid(from: string): string {
  if (from.includes('@')) return from
  return `${from}@s.whatsapp.net`
}

export async function humanReply(
  ctx: { from: string },
  flowDynamic: (msgs: Array<{ body: string; delay: number; media?: string }>) => Promise<void>,
  text: string | string[],
  options: ReplyOptions = {},
): Promise<void> {
  const parts = Array.isArray(text) ? text : [text]
  if (parts.length === 0 || parts.every(p => !p)) return

  const { provider, delay, media, decisionTrace } = options
  const hasMedia = !!media

  let composingTimer: ReturnType<typeof setInterval> | null = null
  const jid = toJid(ctx.from)

  if (!hasMedia && provider?.vendor?.sendPresenceUpdate) {
    provider.vendor.sendPresenceUpdate(jid, 'composing').catch(() => {})
    composingTimer = setInterval(() => {
      provider.vendor!.sendPresenceUpdate!(jid, 'composing').catch(() => {})
    }, 2000)
  }

  const totalLen = parts.join(' ').length
  const baseDelay = delay ?? (hasMedia ? 500 : Math.max(600, Math.min(3500, totalLen * 28)))
  if (baseDelay > 0) {
    await sleep(baseDelay)
  }

  if (composingTimer) {
    clearInterval(composingTimer)
    composingTimer = null
    if (provider?.vendor?.sendPresenceUpdate) {
      provider.vendor.sendPresenceUpdate(jid, 'paused').catch(() => {})
    }
  }

  for (let i = 0; i < parts.length; i++) {
    const msg: { body: string; delay: number; media?: string } = {
      body: parts[i],
      delay: delay ?? (i > 0 ? delayBetween() : rnd()),
    }
    if (media && i === 0) msg.media = media
    await flowDynamic([msg])

    // Registrar la respuesta del bot en el dashboard (todas las respuestas, no solo con trace)
    const ml = (options as Record<string, unknown>)._messageLog as { outgoing: (p: string, m: string, meta?: string) => void } | undefined
    if (ml) {
      try { ml.outgoing(ctx.from, parts[i], decisionTrace) } catch { /* ok */ }
    }
  }
}
