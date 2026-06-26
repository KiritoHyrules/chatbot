import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DATA_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DATA_DIR, 'cee.db')

let _db: SqlJsDatabase | null = null
let saveTimer: ReturnType<typeof setInterval> | null = null

export async function initDb(): Promise<SqlJsDatabase> {
  if (_db) return _db

  mkdirSync(DATA_DIR, { recursive: true })
  const SQL = await initSqlJs()

  let buffer: Uint8Array | undefined
  if (existsSync(DB_PATH)) {
    buffer = readFileSync(DB_PATH)
    _db = new SQL.Database(buffer)
  } else {
    _db = new SQL.Database()
  }

  _db.run('PRAGMA journal_mode = WAL')
  _db.run('PRAGMA foreign_keys = ON')

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
      ts TEXT NOT NULL
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
      sent_at TEXT
    );
  `)

  saveDb()

  // Auto-save every 10 seconds
  if (!saveTimer) {
    saveTimer = setInterval(saveDb, 10_000)
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
  const buffer = Buffer.from(data)
  writeFileSync(DB_PATH, buffer)
}

export function closeDb(): void {
  if (saveTimer) {
    clearInterval(saveTimer)
    saveTimer = null
  }
  if (_db) {
    saveDb()
    _db.close()
    _db = null
  }
}
