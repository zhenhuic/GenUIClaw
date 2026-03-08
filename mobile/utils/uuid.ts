/**
 * UUID v4 generator with fallback for insecure contexts.
 *
 * `crypto.randomUUID()` is only available in secure contexts (HTTPS or localhost).
 * When the mobile web app is accessed over HTTP on a LAN IP (e.g. http://192.168.x.x:9527),
 * the browser treats it as an insecure context and `crypto.randomUUID()` is undefined.
 *
 * This module provides a `generateUUID()` function that:
 *  1. Uses `crypto.randomUUID()` when available (secure context).
 *  2. Falls back to `crypto.getRandomValues()` which IS available in insecure contexts.
 */

function uuidFromRandomValues(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  // Set version (4) and variant (10xx) bits per RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-' +
    hex.slice(12, 16) +
    '-' +
    hex.slice(16, 20) +
    '-' +
    hex.slice(20)
  )
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return uuidFromRandomValues()
}
