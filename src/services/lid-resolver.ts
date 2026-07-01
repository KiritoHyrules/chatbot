import type { BaileysProvider as BaileysProviderType } from '@builderbot/provider-baileys'
import { getDb, saveDb } from '../database/sqlite.js'
import { isResolved, resolveLid, normalizeLeadId } from './lead-id.js'
import type { LeadId } from './lead-id.js'
import { outbox } from './store.js'

let providerRef: BaileysProviderType | null = null

export function setProvider(p: BaileysProviderType): void {
  providerRef = p
}

export async function resolvePendingLids(): Promise<number> {
  if (!providerRef) return 0

  const db = getDb()
  const stmt = db.prepare("SELECT DISTINCT phone FROM dashboard_meta WHERE phone LIKE 'lid:%'")
  const lids: string[] = []
  while (stmt.step()) {
    lids.push(stmt.getAsObject().phone as string)
  }
  stmt.free()

  let resolved = 0
  for (const lidKey of lids) {
    const lid = lidKey.replace('lid:', '') + '@lid'
    try {
      const pn = await providerRef.getPNForLID(lid)
      if (pn) {
        await migrateLidToPn(lidKey as LeadId, pn)
        resolved++
      }
    } catch {
      /* seguir con el siguiente */
    }
  }

  if (resolved > 0) saveDb()
  return resolved
}

export async function handleContactUpdate(lid: string, pn: string): Promise<void> {
  const lidKey = normalizeLeadId(lid) // lid:xxxx
  if (isResolved(lidKey)) return

  await migrateLidToPn(lidKey, pn)
  saveDb()
}

async function migrateLidToPn(lidKey: LeadId, pnRaw: string): Promise<void> {
  const normalized = normalizeLeadId(pnRaw)
  const db = getDb()

  const tables = ['leads', 'dashboard_messages', 'dashboard_meta', 'ai_history']
  for (const table of tables) {
    try {
      db.run(`UPDATE ${table} SET phone = ? WHERE phone = ?`, [normalized, lidKey])
    } catch {
      /* puede fallar en PK si ya existe el phone normalizado — usar UPDATE OR IGNORE */
      db.run(`UPDATE OR IGNORE ${table} SET phone = ? WHERE phone = ?`, [normalized, lidKey])
    }
  }

  try {
    const convStmt = db.prepare('UPDATE conv_state SET phone = ? WHERE phone = ?')
    convStmt.bind([normalized, lidKey])
    convStmt.step()
    convStmt.free()
  } catch {
    db.run('UPDATE OR IGNORE conv_state SET phone = ? WHERE phone = ?', [normalized, lidKey])
  }

  normalizeOutboxLid(db, lidKey, normalized)

  outbox.enqueue('lead.id_resolved', {
    from: lidKey,
    to: normalized,
    resolved_at: new Date().toISOString(),
  })
}

function normalizeOutboxLid(db: ReturnType<typeof getDb>, lidKey: string, normalized: string): void {
  const stmt = db.prepare("SELECT id, payload FROM outbox")
  const updates: Array<[number, string]> = []
  while (stmt.step()) {
    const row = stmt.getAsObject() as { id: number; payload: string }
    try {
      const parsed = JSON.parse(row.payload)
      let changed = false
      if (parsed.lead?.phone === lidKey) { parsed.lead.phone = normalized; changed = true }
      if (parsed.lead?.id === lidKey) { parsed.lead.id = normalized; changed = true }
      if (changed) updates.push([row.id, JSON.stringify(parsed)])
    } catch { /* skip */ }
  }
  stmt.free()
  for (const [id, newPayload] of updates) {
    db.run("UPDATE outbox SET payload = ? WHERE id = ?", [newPayload, id])
  }
}

export async function setupLidListener(): Promise<void> {
  if (!providerRef) return

  try {
    const vendor = (providerRef as unknown as Record<string, Record<string, unknown>>).vendor
    if (vendor && typeof vendor === 'object') {
      const ev = vendor.ev as { on?: (event: string, fn: (...args: unknown[]) => void) => void }
      if (ev?.on) {
        ev.on('contacts.update', async (update: unknown) => {
          const upd = update as Record<string, unknown>
          if (Array.isArray(upd)) {
            for (const contact of upd) {
              const c = contact as Record<string, string>
              if (c.id?.endsWith('@lid') && c.notify) {
                await handleContactUpdate(c.id, c.notify)
              }
            }
          }
        })
        console.log('[LID] Listener contacts.update configurado.')
      }
    }
  } catch (err) {
    console.warn('[LID] No se pudo configurar listener:', (err as Error)?.message)
  }
}
