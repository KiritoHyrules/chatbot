import { createProvider } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'

import { child } from '../logger.js'
const log = child('wa')

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
          log.info('WhatsApp conectado.')
        }
        if (u.connection === 'close') {
          connectionState = 'disconnected'
          const statusCode = u.lastDisconnect?.error?.output?.statusCode
          lastDisconnectReason = statusCode ? `status=${statusCode}` : 'unknown'

          if (statusCode === 401 || statusCode === 403) {
            log.error('Sesión inválida/expirada (%d). Se requiere nuevo QR.', statusCode)
            return
          }

          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++
            const secs = RECONNECT_DELAY_MS / 1000
            log.warn('Desconectado. Reintento %d/%d en %ds...', reconnectAttempts, MAX_RECONNECT_ATTEMPTS, secs)
          } else {
            log.error('%d intentos fallidos. Requiere intervención manual.', MAX_RECONNECT_ATTEMPTS)
          }
        }
        if (u.connection === 'connecting') {
          connectionState = 'connecting'
        }
      })
    } else {
      log.warn('No se pudo registrar listener de reconexión (estructura interna de Baileys cambió).')
    }
  } catch (err) {
    log.warn('Error registrando handler de reconexión: %s', (err as Error)?.message ?? err)
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
