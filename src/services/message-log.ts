import { dashboard } from './store.js'
import type { ChatMode } from './store.js'

export { dashboard }
export type { ChatMode }

export const messageLog = {
  incoming(phone: string, message: string, name?: string): void {
    dashboard.addMessage(phone, 'user', message)
    if (name) dashboard.setName(phone, name)
  },

  outgoing(phone: string, message: string): void {
    dashboard.addMessage(phone, 'assistant', message)
  },

  human(phone: string, name: string, message: string): void {
    dashboard.addMessage(phone, 'human', message)
    dashboard.setName(phone, name)
  },

  shouldRespond(phone: string): boolean {
    return dashboard.getMode(phone) === 'AI'
  },

  setMode(phone: string, mode: ChatMode): void {
    dashboard.setMode(phone, mode)
  },
}
