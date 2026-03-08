/**
 * Authentication utilities for remote access.
 *
 * - Device codes: 6-character alphanumeric codes for pairing
 * - Tokens: HMAC-SHA256 signed tokens for connection auth
 */

import { randomBytes, createHmac, timingSafeEqual } from 'crypto'

const DEVICE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid ambiguity
const DEVICE_CODE_LENGTH = 6

/** Generate a 6-character device pairing code. */
export function generateDeviceCode(): string {
  const bytes = randomBytes(DEVICE_CODE_LENGTH)
  let code = ''
  for (let i = 0; i < DEVICE_CODE_LENGTH; i++) {
    code += DEVICE_CODE_CHARS[bytes[i] % DEVICE_CODE_CHARS.length]
  }
  return code
}

/** Generate a random 256-bit secret for HMAC signing. */
export function generateSecret(): string {
  return randomBytes(32).toString('hex')
}

/** Sign a payload with HMAC-SHA256. */
export function signToken(secret: string, payload: string): string {
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  return hmac.digest('hex')
}

/** Create a connection token: `<timestamp>.<signature>` */
export function createToken(secret: string): string {
  const timestamp = Date.now().toString()
  const signature = signToken(secret, timestamp)
  return `${timestamp}.${signature}`
}

/** Verify a connection token. Returns true if valid and not expired (30 min). */
export function verifyToken(token: string, secret: string, maxAgeMs = 30 * 60 * 1000): boolean {
  const parts = token.split('.')
  if (parts.length !== 2) return false

  const [timestamp, signature] = parts
  const expectedSig = signToken(secret, timestamp)

  // Constant-time comparison to prevent timing attacks
  try {
    const sigBuf = Buffer.from(signature, 'hex')
    const expectedBuf = Buffer.from(expectedSig, 'hex')
    if (sigBuf.length !== expectedBuf.length) return false
    if (!timingSafeEqual(sigBuf, expectedBuf)) return false
  } catch {
    return false
  }

  // Check expiry
  const ts = parseInt(timestamp, 10)
  if (isNaN(ts)) return false
  return Date.now() - ts < maxAgeMs
}
