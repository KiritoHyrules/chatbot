const FIRST_MSG_DEBOUNCE_MS = 1500
const FULL_BURST_WINDOW_MS = 2000

import { child } from '../logger.js'
const log = child('agg')

interface BufferEntry {
  messages: string[]
  timer: ReturnType<typeof setTimeout> | null
  currentFlow: string | null
  _pendingResolve: ((value: string | null) => void) | null
}

const buffers = new Map<string, BufferEntry>()
const CRITICAL_COMMANDS = new Set(['cancelar', 'salir', '0'])

log.info('message-aggregator.ts cargado')

export function isEnabled(): boolean {
  return process.env.ENABLE_MESSAGE_AGGREGATOR !== 'false'
}

function getSeparator(currentFlow: string | null): string {
  return currentFlow === 'lead_capture' ? '' : ' '
}

export function waitForBurst(phone: string, message: string, flow?: string): Promise<string | null> {
  if (!isEnabled()) {
    return Promise.resolve(message)
  }

  // Comandos críticos → flush inmediato, no esperar
  if (CRITICAL_COMMANDS.has(message)) {
    const entry = buffers.get(phone)
    if (entry) {
      if (entry.timer) clearTimeout(entry.timer)
      if (entry._pendingResolve) {
        const r = entry._pendingResolve
        entry._pendingResolve = null
        r(entry.messages.join(getSeparator(entry.currentFlow)))
      }
      buffers.delete(phone)
    }
    return Promise.resolve(message)
  }

  const existing = buffers.get(phone)

  // Si ya hay una Promise esperando, resolverla con null (fue reemplazada)
  if (existing && existing._pendingResolve) {
    const oldResolve = existing._pendingResolve
    existing._pendingResolve = null
    oldResolve(null)
    log.debug('Cancelado: %s (reemplazada por nueva burst)', phone)
  }

  // Agregar o crear entrada
  if (existing) {
    existing.messages.push(message)
    if (flow) existing.currentFlow = flow
    if (existing.timer) clearTimeout(existing.timer)
    // Ya es segunda ráfaga → usar ventana completa
    existing.timer = setTimeout(() => doFlush(phone), FULL_BURST_WINDOW_MS)
  } else {
    const entry: BufferEntry = {
      messages: [message],
      timer: null,
      currentFlow: flow ?? null,
      _pendingResolve: null,
    }
    // Primer mensaje → ventana corta (200ms)
    const windowMs = FIRST_MSG_DEBOUNCE_MS
    entry.timer = setTimeout(() => doFlush(phone), windowMs)
    buffers.set(phone, entry)
    log.debug('Wait: %s first msg, windowMs=%d msg="%s"', phone, windowMs, message.slice(0, 30))
  }

  return new Promise((resolve) => {
    const entry = buffers.get(phone)
    if (entry) {
      entry._pendingResolve = resolve
    } else {
      // ya se flusheó antes de que registremos la Promise
      resolve(message)
    }
  })
}

function doFlush(phone: string): void {
  const entry = buffers.get(phone)
  if (!entry) return

  if (entry.timer) {
    clearTimeout(entry.timer)
    entry.timer = null
  }

  const sep = getSeparator(entry.currentFlow)
  const aggregated = entry.messages.join(sep)
  const resolve = entry._pendingResolve
  buffers.delete(phone)

  log.debug('Resolve: %s aggregated="%s"', phone, aggregated.slice(0, 60))
  if (resolve) {
    resolve(aggregated)
  }
}

// Funciones legacy mantenidas para los tests existentes
export function enqueue(
  phone: string,
  message: string,
  _flow?: string,
): { shouldProcess: boolean; aggregated?: string } {
  return { shouldProcess: true, aggregated: message }
}

export function flush(phone: string): string | null {
  const entry = buffers.get(phone)
  if (!entry || entry.messages.length === 0) return null
  if (entry.timer) clearTimeout(entry.timer)
  const aggregated = entry.messages.join(' ')
  if (entry._pendingResolve) {
    entry._pendingResolve(aggregated)
  }
  buffers.delete(phone)
  return aggregated
}

export function drop(phone: string): void {
  const entry = buffers.get(phone)
  if (entry?.timer) clearTimeout(entry.timer)
  if (entry?._pendingResolve) {
    entry._pendingResolve(null)
  }
  buffers.delete(phone)
}

export function dropAll(): void {
  for (const [phone, entry] of buffers) {
    if (entry.timer) clearTimeout(entry.timer)
    if (entry._pendingResolve) {
      entry._pendingResolve(null)
    }
  }
  buffers.clear()
  log.info('Todos los buffers limpiados en shutdown.')
}
