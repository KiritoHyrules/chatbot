import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { child } from '../logger.js'
const log = child('sqlite')

const DATA_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DATA_DIR, 'cee.db')
const DB_BACKUP_PATH = join(DATA_DIR, 'cee.db.bak')
const DB_WAL_PATH = DB_PATH + '-wal'
const DB_SHM_PATH = DB_PATH + '-shm'

let _db: SqlJsDatabase | null = null
let saveTimer: ReturnType<typeof setInterval> | null = null
let _healthy = false
let _lastSaveOk = true

export function isDbHealthy(): boolean {
  if (!_db) return false
  return _healthy && _lastSaveOk
}

async function tryBackupExistingDb(): Promise<boolean> {
  try {
    if (!existsSync(DB_PATH)) return true

    const SQL = await initSqlJs()
    const buffer = readFileSync(DB_PATH)
    const testDb = new SQL.Database(buffer)
    const results: Array<{ ok: string }> = []
    testDb.exec('PRAGMA integrity_check')
    const stmt = testDb.prepare('PRAGMA integrity_check')
    while (stmt.step()) {
      results.push(stmt.getAsObject() as { ok: string })
    }
    stmt.free()

    const integrityOk = results.length === 1 && results[0].ok === 'ok'
    testDb.close()

    if (integrityOk) {
      // Crear backup antes de cargar
      copyFileSync(DB_PATH, DB_BACKUP_PATH)
      log.info('Backup creado: cee.db.bak')
      return true
    }

    // DB corrupta → renombrar y crear nueva
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const corruptPath = join(DATA_DIR, `cee.db.corrupt.${timestamp}`)
    renameSync(DB_PATH, corruptPath)
    log.warn(`Base de datos corrupta detectada. Renombrada a: ${corruptPath}`)

    // Intentar restaurar desde backup
    if (existsSync(DB_BACKUP_PATH)) {
      copyFileSync(DB_BACKUP_PATH, DB_PATH)
      log.info('Restaurado desde backup: cee.db.bak')
      return true
    }

    // Limpiar WAL/SHM si existen
    try { if (existsSync(DB_WAL_PATH)) renameSync(DB_WAL_PATH, DB_WAL_PATH + '.old') } catch { /* ok */ }
    try { if (existsSync(DB_SHM_PATH)) renameSync(DB_SHM_PATH, DB_SHM_PATH + '.old') } catch { /* ok */ }

    return false
  } catch (err) {
    log.error('Error verificando integridad: %s', (err as Error)?.message ?? err)
    return false
  }
}

export async function initDb(): Promise<SqlJsDatabase> {
  if (_db) return _db

  mkdirSync(DATA_DIR, { recursive: true })
  const SQL = await initSqlJs()

  // Verificar integridad antes de cargar
  if (existsSync(DB_PATH)) {
    const integrityOk = await tryBackupExistingDb()
    if (!integrityOk) {
      log.warn('No se pudo recuperar la DB. Creando nueva.')
    }
  }

  let buffer: Uint8Array | undefined
  if (existsSync(DB_PATH)) {
    try {
      buffer = readFileSync(DB_PATH)
      _db = new SQL.Database(buffer)
    } catch (err) {
      log.error('Error cargando base de datos: %s', (err as Error)?.message ?? err)
      // Intentar desde backup
      if (existsSync(DB_BACKUP_PATH)) {
        try {
          buffer = readFileSync(DB_BACKUP_PATH)
          _db = new SQL.Database(buffer)
          writeFileSync(DB_PATH, buffer)
          log.info('Restaurado desde backup tras error de carga.')
        } catch {
          _db = new SQL.Database()
          log.warn('Backup también corrupto. Creando BD nueva.')
        }
      } else {
        _db = new SQL.Database()
        log.warn('Sin backup disponible. Creando BD nueva.')
      }
    }
  } else {
    _db = new SQL.Database()
  }

  _db.run('PRAGMA journal_mode = WAL')
  _db.run('PRAGMA foreign_keys = ON')
  _db.run('PRAGMA busy_timeout = 5000')

  _db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      dni TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      program_interest TEXT,
      status TEXT NOT NULL DEFAULT 'nuevo',
      deal_stage TEXT,
      classification_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dashboard_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL CHECK(role IN ('user','assistant','human')),
      content TEXT NOT NULL,
      ts TEXT NOT NULL,
      metadata TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_dm_phone ON dashboard_messages(phone);
    CREATE TABLE IF NOT EXISTS dashboard_meta (
      phone TEXT PRIMARY KEY,
      name TEXT,
      mode TEXT NOT NULL DEFAULT 'AI' CHECK(mode IN ('AI','HUMAN')),
      last_activity TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_history (
      phone TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_phone ON ai_history(phone);
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      sent_at TEXT,
      next_retry_at TEXT
    );
    CREATE TABLE IF NOT EXISTS conv_state (
      phone TEXT PRIMARY KEY,
      state TEXT NOT NULL DEFAULT 'IDLE',
      data_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS knowledge_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      normalized TEXT NOT NULL,
      matched_source TEXT,
      was_useful INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gemini_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      requests INTEGER DEFAULT 0,
      tokens INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      UNIQUE(date)
    );
  `)

  // Agregar columnas faltantes (compatibilidad con versiones anteriores)
  try { _db.exec('ALTER TABLE outbox ADD COLUMN next_retry_at TEXT') } catch { /* ya existe */ }
  try { _db.exec('ALTER TABLE dashboard_messages ADD COLUMN metadata TEXT') } catch { /* ya existe */ }

  _healthy = true
  _lastSaveOk = true
  saveDb()

  // Ejecutar migraciones
  try {
    const { migrate001 } = await import('./migrations/001-normalize-lead-ids.js')
    migrate001()
  } catch (err) {
    log.warn('Error ejecutando migraciones: %s', (err as Error)?.message ?? err)
  }

  // Auto-save cada 10 segundos
  if (!saveTimer) {
    saveTimer = setInterval(() => {
      if (!_db) return
      try {
        saveDb()
        _lastSaveOk = true
      } catch (err) {
        log.error('Error en auto-save: %s', (err as Error)?.message ?? err)
        _lastSaveOk = false
      }
    }, 10_000)
  }

  return _db
}

export function getDb(): SqlJsDatabase {
  if (!_db) throw new Error('Database not initialized. Call initDb() first.')
  return _db
}

export function saveDb(): void {
  if (!_db) return
  const data = _db.export()

  // Guardar backup antes de sobrescribir
  try {
    if (existsSync(DB_PATH)) {
      copyFileSync(DB_PATH, DB_BACKUP_PATH)
    }
  } catch { /* backup no crítico */ }

  const buffer = Buffer.from(data)
  writeFileSync(DB_PATH, buffer)
  _lastSaveOk = true
}

export function verifyDbHealth(): { healthy: boolean; details: string } {
  if (!_db) return { healthy: false, details: 'DB no inicializada' }
  try {
    const results: Array<{ ok: string }> = []
    _db.exec('PRAGMA integrity_check')
    const stmt = _db.prepare('PRAGMA integrity_check')
    while (stmt.step()) {
      results.push(stmt.getAsObject() as { ok: string })
    }
    stmt.free()
    const healthy = results.length === 1 && results[0].ok === 'ok'
    _healthy = healthy
    return { healthy, details: healthy ? 'ok' : results.map(r => r.ok).join(', ') }
  } catch (err) {
    _healthy = false
    return { healthy: false, details: (err as Error)?.message ?? 'error desconocido' }
  }
}

export function closeDb(): void {
  if (saveTimer) {
    clearInterval(saveTimer)
    saveTimer = null
  }
  if (_db) {
    try {
      saveDb()
    } catch (err) {
      log.error('Error en saveDb durante cierre: %s', (err as Error)?.message ?? err)
    }
    try {
      _db.close()
    } catch { /* ok */ }
    _db = null
    _healthy = false
    _lastSaveOk = false
  }
}
