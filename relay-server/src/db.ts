import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = path.join(DATA_DIR, 'relay.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema()
  }
  return db
}

function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS remote_agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      pairing_key TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS remote_conversations (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES remote_agents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New Conversation',
      desktop_conversation_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS remote_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES remote_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `)

  // Migrations: add columns if they don't exist yet
  const agentCols = db.pragma('table_info(remote_agents)') as Array<{ name: string }>
  if (!agentCols.find((c) => c.name === 'config_json')) {
    db.exec(`ALTER TABLE remote_agents ADD COLUMN config_json TEXT DEFAULT '{}'`)
  }
}

export function closeDb(): void {
  if (db) {
    db.close()
  }
}
