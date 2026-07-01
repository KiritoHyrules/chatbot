import { dashboard } from './store.js'
import type { ChatMode } from './store.js'
import { normalizeLeadId } from './lead-id.js'

export { dashboard }
export type { ChatMode }

export const messageLog = {
  incoming(phone: string, message: string, name?: string): void {
    const normalized = normalizeLeadId(phone)
    dashboard.addMessage(normalized, 'user', message)
    if (name) dashboard.setName(normalized, name)
  },

  outgoing(phone: string, message: string, meta?: string): void {
    const normalized = normalizeLeadId(phone)
    dashboard.addMessage(normalized, 'assistant', message, undefined, meta)
  },

  human(phone: string, name: string, message: string): void {
    const normalized = normalizeLeadId(phone)
    dashboard.addMessage(normalized, 'human', message)
    dashboard.setName(normalized, name)
  },

  shouldRespond(phone: string): boolean {
    return dashboard.getMode(phone) === 'AI'
  },

  setMode(phone: string, mode: ChatMode): void {
    dashboard.setMode(phone, mode)
  },
}
