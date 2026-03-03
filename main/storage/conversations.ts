import { randomUUID } from 'crypto'
import { getDb } from './database'
import type { Conversation } from '../../shared/types/conversation'

function parseIsRemote(meta: string | null): boolean {
  try {
    return !!(JSON.parse(meta ?? '{}') as Record<string, unknown>).isRemote
  } catch {
    return false
  }
}

export function listConversations(): Conversation[] {
  const rows = getDb()
    .prepare('SELECT id, title, created_at, updated_at, meta FROM conversations ORDER BY updated_at DESC')
    .all() as Array<{ id: string; title: string; created_at: number; updated_at: number; meta: string | null }>

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isRemote: parseIsRemote(r.meta),
  }))
}

export function getConversation(id: string): Conversation | null {
  const row = getDb()
    .prepare('SELECT id, title, created_at, updated_at, meta FROM conversations WHERE id = ?')
    .get(id) as { id: string; title: string; created_at: number; updated_at: number; meta: string | null } | undefined

  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isRemote: parseIsRemote(row.meta),
  }
}

export function createConversation(title: string): Conversation {
  const id = randomUUID()
  const now = Date.now()
  getDb()
    .prepare('INSERT INTO conversations (id, title, created_at, updated_at, meta) VALUES (?, ?, ?, ?, ?)')
    .run(id, title, now, now, '{}')
  return { id, title, createdAt: now, updatedAt: now }
}

export function createRemoteConversation(title: string, relayConversationId?: string): Conversation {
  const id = randomUUID()
  const now = Date.now()
  const meta = JSON.stringify({ isRemote: true, relayConversationId: relayConversationId ?? null })
  getDb()
    .prepare('INSERT INTO conversations (id, title, created_at, updated_at, meta) VALUES (?, ?, ?, ?, ?)')
    .run(id, title, now, now, meta)
  return { id, title, createdAt: now, updatedAt: now, isRemote: true }
}

/** Find desktop conversation by relay server's conversation ID */
export function getConversationByRelayId(relayConversationId: string): Conversation | null {
  if (!relayConversationId) return null
  const row = getDb()
    .prepare(
      `SELECT id, title, created_at, updated_at, meta FROM conversations 
       WHERE json_extract(meta, '$.relayConversationId') = ?`
    )
    .get(relayConversationId) as
    | { id: string; title: string; created_at: number; updated_at: number; meta: string | null }
    | undefined

  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isRemote: true,
  }
}

export function updateConversationTitle(id: string, title: string): void {
  getDb()
    .prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?')
    .run(title, Date.now(), id)
}

export function touchConversation(id: string): void {
  getDb()
    .prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
    .run(Date.now(), id)
}

export function deleteConversation(id: string): void {
  getDb().prepare('DELETE FROM conversations WHERE id = ?').run(id)
}
