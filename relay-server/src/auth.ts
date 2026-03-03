import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { getDb } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'genuiclaw-relay-secret-change-in-production'
const JWT_EXPIRES_IN = '30d'
const SALT_ROUNDS = 10

export interface JwtPayload {
  userId: string
  email: string
}

export async function register(email: string, password: string): Promise<{ token: string }> {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) throw new Error('Email already registered')

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const id = randomUUID()
  const now = Date.now()
  db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    email,
    passwordHash,
    now
  )

  const token = jwt.sign({ userId: id, email } satisfies JwtPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
  return { token }
}

export async function login(email: string, password: string): Promise<{ token: string }> {
  const db = getDb()
  const user = db
    .prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
    .get(email) as { id: string; email: string; password_hash: string } | undefined

  if (!user) throw new Error('Invalid credentials')

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw new Error('Invalid credentials')

  const token = jwt.sign({ userId: user.id, email: user.email } satisfies JwtPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
  return { token }
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}
