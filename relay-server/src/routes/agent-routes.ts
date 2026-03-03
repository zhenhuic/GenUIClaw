import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { getDb } from '../db'
import { authMiddleware } from './middleware'

const router = Router()

router.use(authMiddleware)

router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const userId = (req as Request & { userId: string }).userId
  const agents = db
    .prepare('SELECT id, name, pairing_key, created_at FROM remote_agents WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as Array<{ id: string; name: string; pairing_key: string; created_at: number }>

  res.json(
    agents.map((a) => ({
      id: a.id,
      name: a.name,
      pairingKey: a.pairing_key,
      createdAt: a.created_at,
    }))
  )
})

router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const userId = (req as Request & { userId: string }).userId
  const { name, pairingKey } = req.body as { name?: string; pairingKey?: string }

  if (!name || !pairingKey) {
    res.status(400).json({ error: 'name and pairingKey are required' })
    return
  }

  const existing = db.prepare('SELECT id FROM remote_agents WHERE pairing_key = ?').get(pairingKey)
  if (existing) {
    res.status(400).json({ error: 'Pairing key already registered' })
    return
  }

  const id = randomUUID()
  const now = Date.now()
  db.prepare('INSERT INTO remote_agents (id, user_id, name, pairing_key, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    userId,
    name,
    pairingKey,
    now
  )

  res.json({ id, name, pairingKey, createdAt: now })
})

router.get('/:id/config', (req: Request, res: Response) => {
  const db = getDb()
  const userId = (req as Request & { userId: string }).userId
  const { id } = req.params

  const agent = db
    .prepare('SELECT id, config_json FROM remote_agents WHERE id = ? AND user_id = ?')
    .get(id, userId) as { id: string; config_json: string | null } | undefined

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  try {
    const config = JSON.parse(agent.config_json ?? '{}') as { models?: unknown[]; skills?: unknown[] }
    res.json({ models: config.models ?? [], skills: config.skills ?? [] })
  } catch {
    res.json({ models: [], skills: [] })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const userId = (req as Request & { userId: string }).userId
  const { id } = req.params

  const agent = db
    .prepare('SELECT id FROM remote_agents WHERE id = ? AND user_id = ?')
    .get(id, userId)
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' })
    return
  }

  db.prepare('DELETE FROM remote_agents WHERE id = ?').run(id)
  res.json({ success: true })
})

export default router
