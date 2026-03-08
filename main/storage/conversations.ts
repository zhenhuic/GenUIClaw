import { randomUUID } from 'crypto'
import { getDb } from './database'
import type { Conversation } from '../../shared/types/conversation'

function parseMeta(metaStr: string | undefined): Record<string, unknown> {
  try {
    return metaStr ? JSON.parse(metaStr) : {}
  } catch {
    return {}
  }
}

export function listConversations(): Conversation[] {
  const rows = getDb()
    .prepare('SELECT id, title, created_at, updated_at, meta FROM conversations ORDER BY updated_at DESC')
    .all() as Array<{ id: string; title: string; created_at: number; updated_at: number; meta?: string }>

  return rows.map((r) => {
    const meta = parseMeta(r.meta)
    return {
      id: r.id,
      title: r.title,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      source: (meta.source as 'desktop' | 'remote') || 'desktop',
    }
  })
}

export function getConversation(id: string): Conversation | null {
  const row = getDb()
    .prepare('SELECT id, title, created_at, updated_at, meta FROM conversations WHERE id = ?')
    .get(id) as { id: string; title: string; created_at: number; updated_at: number; meta?: string } | undefined

  if (!row) return null
  const meta = parseMeta(row.meta)
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: (meta.source as 'desktop' | 'remote') || 'desktop',
  }
}

export function createConversation(title: string, source: 'desktop' | 'remote' = 'desktop'): Conversation {
  const id = randomUUID()
  const now = Date.now()
  const meta = JSON.stringify({ source })
  getDb()
    .prepare('INSERT INTO conversations (id, title, created_at, updated_at, meta) VALUES (?, ?, ?, ?, ?)')
    .run(id, title, now, now, meta)
  return { id, title, createdAt: now, updatedAt: now, source }
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
