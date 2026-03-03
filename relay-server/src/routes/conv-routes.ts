import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { getDb } from '../db'
import { authMiddleware } from './middleware'

const router = Router()

router.use(authMiddleware)

router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const userId = (req as Request & { userId: string }).userId
  const agentId = req.query.agentId as string | undefined

  let query = 'SELECT id, agent_id, title, desktop_conversation_id, created_at, updated_at FROM remote_conversations WHERE user_id = ?'
  const params: unknown[] = [userId]

  if (agentId) {
    query += ' AND agent_id = ?'
    params.push(agentId)
  }

  query += ' ORDER BY updated_at DESC'

  const rows = db.prepare(query).all(...params) as Array<{
    id: string
    agent_id: string
    title: string
    desktop_conversation_id: string | null
    created_at: number
    updated_at: number
  }>

  res.json(
    rows.map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      title: r.title,
      desktopConversationId: r.desktop_conversation_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  )
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const userId = (req as Request & { userId: string }).userId
  const { agentId, title } = req.body as { agentId?: string; title?: string }

  if (!agentId) {
    res.status(400).json({ error: 'agentId is required' })
    return
  }

  const agent = db.prepare('SELECT id FROM remote_agents WHERE id = ? AND user_id = ?').get(agentId, userId)
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  const id = randomUUID()
  const now = Date.now()
  db.prepare(
    'INSERT INTO remote_conversations (id, agent_id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, agentId, userId, title || 'New Conversation', now, now)

  res.json({ id, agentId, title: title || 'New Conversation', createdAt: now, updatedAt: now })
})

router.patch('/:id/title', (req: Request, res: Response) => {
  const db = getDb()
  const userId = (req as Request & { userId: string }).userId
  const { id } = req.params
  const { title } = req.body as { title?: string }

  if (!title) {
    res.status(400).json({ error: 'title is required' })
    return
  }

  const conv = db
    .prepare('SELECT id FROM remote_conversations WHERE id = ? AND user_id = ?')
    .get(id, userId)
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' })
    return
  }

  db.prepare('UPDATE remote_conversations SET title = ?, updated_at = ? WHERE id = ?')
    .run(title, Date.now(), id)

  res.json({ success: true })
})

router.get('/:id/messages', (req: Request, res: Response) => {
  const db = getDb()
  const userId = (req as Request & { userId: string }).userId
  const { id } = req.params

  const conv = db
    .prepare('SELECT id FROM remote_conversations WHERE id = ? AND user_id = ?')
    .get(id, userId)
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' })
    return
  }

  const messages = db
    .prepare('SELECT id, role, content_json, created_at FROM remote_messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(id) as Array<{ id: string; role: string; content_json: string; created_at: number }>

  res.json(
    messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: JSON.parse(m.content_json),
      createdAt: m.created_at,
    }))
  )
})

export default router
