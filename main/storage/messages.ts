import { randomUUID } from 'crypto'
import { getDb } from './database'
import { touchConversation } from './conversations'
import type { AppMessage, MessageContentBlock } from '../../shared/types/conversation'

export function getMessages(conversationId: string): AppMessage[] {
  const rows = getDb()
    .prepare(
      'SELECT id, conversation_id, role, content, session_id, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    )
    .all(conversationId) as Array<{
    id: string
    conversation_id: string
    role: string
    content: string
    session_id: string | null
    created_at: number
  }>

  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role as 'user' | 'assistant',
    content: JSON.parse(r.content) as MessageContentBlock[],
    sessionId: r.session_id ?? undefined,
    createdAt: r.created_at,
  }))
}

export function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: MessageContentBlock[],
  sessionId?: string
): AppMessage {
  const id = randomUUID()
  const now = Date.now()
  getDb()
    .prepare(
      'INSERT INTO messages (id, conversation_id, role, content, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(id, conversationId, role, JSON.stringify(content), sessionId ?? null, now)

  touchConversation(conversationId)
  return { id, conversationId, role, content, sessionId, createdAt: now }
}

export function deleteMessage(id: string): void {
  getDb().prepare('DELETE FROM messages WHERE id = ?').run(id)
}
