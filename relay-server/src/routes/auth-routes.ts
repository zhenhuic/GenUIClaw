import { Router, Request, Response } from 'express'
import { register, login } from '../auth'

const router = Router()

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' })
      return
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'password must be at least 8 characters' })
      return
    }
    const result = await register(email, password)
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: (err as Error).message })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' })
      return
    }
    const result = await login(email, password)
    res.json(result)
  } catch (err) {
    res.status(401).json({ error: (err as Error).message })
  }
})

export default router
