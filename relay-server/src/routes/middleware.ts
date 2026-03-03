import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../auth'

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = verifyToken(token)
    ;(req as Request & { userId: string; userEmail: string }).userId = payload.userId
    ;(req as Request & { userId: string; userEmail: string }).userEmail = payload.email
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
