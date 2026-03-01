import type { WebFrameMain } from 'electron'
import log from 'electron-log'

// Validate that IPC messages come from our renderer, not injected content
export function validateSender(frame: WebFrameMain | null): boolean {
  if (!frame) {
    log.warn('[Security] IPC message received with no sender frame')
    return false
  }

  const url = frame.url
  // Allow file:// protocol (production) and localhost (development)
  const isAllowed =
    url.startsWith('file://') ||
    url.startsWith('http://localhost:') ||
    url.startsWith('http://127.0.0.1:')

  if (!isAllowed) {
    log.warn(`[Security] Rejected IPC from untrusted origin: ${url}`)
  }

  return isAllowed
}
