import { randomUUID } from 'crypto'
import { getDb } from './database'
import type { Conversation } from '../../shared/types/conversation'

export function listConversations(): Conversation[] {
  const rows = getDb()
    .prepare('SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC')
    .all() as Array<{ id: string; title: string; created_at: number; updated_at: number }>

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export function getConversation(id: string): Conversation | null {
  const row = getDb()
    .prepare('SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?')
    .get(id) as { id: string; title: string; created_at: number; updated_at: number } | undefined

  if (!row) return null
  return { id: row.id, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at }
}

export function createConversation(title: string): Conversation {
  const id = randomUUID()
  const now = Date.now()
  getDb()
    .prepare('INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(id, title, now, now)
  return { id, title, createdAt: now, updatedAt: now }
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
