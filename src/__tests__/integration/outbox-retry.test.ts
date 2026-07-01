import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { initDb, closeDb, getDb } from '../../database/sqlite.js'
import { outbox } from '../../services/store.js'

function lastOutboxId(): number {
  const db = getDb()
  const stmt = db.prepare('SELECT MAX(id) as id FROM outbox')
  stmt.step()
  const obj = stmt.getAsObject() as { id: number | null }
  stmt.free()
  return obj.id ?? 0
}

describe('outbox retry policy', () => {
  beforeEach(async () => {
    await initDb()
    getDb().run('DELETE FROM outbox')
  })

  afterEach(() => {
    closeDb()
  })

  it('markFailed calcula backoff correcto', () => {
    outbox.enqueue('test.event', { data: 'test' })
    const id = lastOutboxId()

    outbox.markFailed(id)

    const db = getDb()
    const stmt = db.prepare('SELECT attempts, status, next_retry_at FROM outbox WHERE id = ?')
    stmt.bind([id])
    stmt.step()
    const obj = stmt.getAsObject() as { attempts: number; status: string; next_retry_at: string | null }
    stmt.free()

    expect(obj.attempts).toBe(1)
    expect(obj.status).toBe('pending')
    expect(obj.next_retry_at).toBeTruthy()
  })

  it('markFailed mueve a failed después de 5 intentos', () => {
    outbox.enqueue('test.event', { data: 'test' })
    const id = lastOutboxId()
    const db = getDb()

    for (let i = 0; i < 4; i++) {
      outbox.markFailed(id)
    }

    let stmt = db.prepare('SELECT attempts, status FROM outbox WHERE id = ?')
    stmt.bind([id])
    stmt.step()
    const obj = stmt.getAsObject() as { attempts: number; status: string }
    stmt.free()

    expect(obj.attempts).toBe(4)
    expect(obj.status).toBe('pending')

    outbox.markFailed(id)

    stmt = db.prepare('SELECT attempts, status FROM outbox WHERE id = ?')
    stmt.bind([id])
    stmt.step()
    const obj2 = stmt.getAsObject() as { attempts: number; status: string }
    stmt.free()

    expect(obj2.attempts).toBe(5)
    expect(obj2.status).toBe('failed')
  })

  it('getPending no devuelve eventos con next_retry_at futuro', () => {
    const future = new Date(Date.now() + 3600_000).toISOString()
    const db = getDb()
    db.run("INSERT INTO outbox (event, payload, status, next_retry_at, created_at) VALUES ('test', '{}', 'pending', ?, ?)", [future, new Date().toISOString()])

    const pending = outbox.getPending(10)
    expect(pending.length).toBe(0)
  })
})
