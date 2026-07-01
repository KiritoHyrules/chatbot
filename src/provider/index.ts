import { createProvider } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'

let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY_MS = 5000
let connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected'
let lastDisconnectReason: string | null = null

export const provider = createProvider(Provider, {
  version: [2, 3000, 1035194821],
})

export function setupReconnectHandler() {
  try {
    const p = provider as unknown as Record<string, unknown>
    const vendor = (p.vendor ?? p) as Record<string, unknown>
    const ev = vendor.ev as Record<string, unknown> | undefined

    if (ev && typeof ev.on === 'function') {
      (ev.on as Function)('connection.update', (update: unknown) => {
        const u = update as { connection?: string; lastDisconnect?: { error?: { output?: { statusCode?: number } } } }
        if (u.connection === 'open') {
          connectionState = 'connected'
          reconnectAttempts = 0
          console.log('[WA] WhatsApp conectado.')
        }
        if (u.connection === 'close') {
          connectionState = 'disconnected'
          const statusCode = u.lastDisconnect?.error?.output?.statusCode
          lastDisconnectReason = statusCode ? `status=${statusCode}` : 'unknown'

          if (statusCode === 401 || statusCode === 403) {
            console.error(`[WA] Sesión inválida/expirada (${statusCode}). Se requiere nuevo QR.`)
            return
          }

          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++
            const secs = RECONNECT_DELAY_MS / 1000
            console.warn(`[WA] Desconectado. Reintento ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} en ${secs}s...`)
          } else {
            console.error(`[WA] ${MAX_RECONNECT_ATTEMPTS} intentos fallidos. Requiere intervención manual.`)
          }
        }
        if (u.connection === 'connecting') {
          connectionState = 'connecting'
        }
      })
    } else {
      console.warn('[WA] No se pudo registrar listener de reconexión (estructura interna de Baileys cambió).')
    }
  } catch (err) {
    console.warn('[WA] Error registrando handler de reconexión:', (err as Error)?.message ?? err)
  }
}

export function getWhatsAppHealth(): {
  state: string
  reconnectAttempts: number
  lastDisconnectReason: string | null
} {
  return {
    state: connectionState,
    reconnectAttempts,
    lastDisconnectReason,
  }
}
