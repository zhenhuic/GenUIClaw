/**
 * Connection state — tracks the relay connection lifecycle.
 *
 * Persists deviceCode + relayUrl to localStorage so the session
 * survives page reloads / browser restarts.
 */

import { create } from 'zustand'
import { relayClient } from '../api/relay-ws-client'
import { createRemoteAPI } from '../api/remote-api'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface ConnectionState {
  status: ConnectionStatus
  deviceCode: string
  relayUrl: string
  error: string | null
  /** True after at least one successful connect in this page session (window.electronAPI is installed). */
  hasConnectedOnce: boolean

  connect: (relayUrl: string, deviceCode: string) => Promise<void>
  disconnect: () => void

  /** Try to auto-connect using ?token= URL param OR persisted session. Returns true if an attempt was made. */
  tryAutoConnect: () => boolean
}

// ---- localStorage helpers ----
const STORAGE_KEY = 'genuiclaw-connection'

interface PersistedSession {
  deviceCode: string
  relayUrl: string
}

function saveSession(session: PersistedSession): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)) } catch { /* ignore */ }
}

function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.deviceCode === 'string' && parsed.deviceCode) return parsed
    return null
  } catch { return null }
}

function clearSession(): void {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

// ---- relay URL derivation ----

/**
 * Derive the relay WebSocket URL from the current page location.
 * If the page is served from the relay server (e.g. https://relay.example.com/app/),
 * we can automatically infer the WebSocket endpoint.
 */
function deriveRelayUrl(): string {
  try {
    const loc = window.location
    const wsProtocol = loc.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsProtocol}//${loc.host}`
  } catch {
    return 'ws://localhost:9527'
  }
}

const DEFAULT_RELAY_URL = deriveRelayUrl()

/** Install remote API shim on window so all stores/hooks work transparently. */
function installRemoteAPI(): void {
  ;(window as any).electronAPI = createRemoteAPI(relayClient)
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'disconnected',
  deviceCode: '',
  relayUrl: DEFAULT_RELAY_URL,
  error: null,
  hasConnectedOnce: false,

  connect: async (relayUrl: string, deviceCode: string) => {
    const code = deviceCode.trim().toUpperCase()
    if (!code) {
      set({ error: 'Please enter a device code' })
      return
    }

    // If we're switching to a different device code, tear down the old connection
    // (including its auto-reconnect timer) first.
    const prev = relayClient.deviceCode
    if (prev && prev !== code) {
      relayClient.disconnect()
    }

    set({ status: 'connecting', deviceCode: code, relayUrl, error: null })

    try {
      await relayClient.connect(relayUrl, code)

      installRemoteAPI()
      saveSession({ deviceCode: code, relayUrl })

      set({ status: 'connected', error: null, hasConnectedOnce: true })
    } catch (err) {
      set({ status: 'error', error: (err as Error).message })
    }
  },

  disconnect: () => {
    relayClient.disconnect()
    clearSession()
    set({ status: 'disconnected', deviceCode: '', error: null })
  },

  tryAutoConnect: () => {
    try {
      // 1. Check for ?token= URL parameter (highest priority)
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')

      if (token) {
        const cleaned = token.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

        // Remove ?token= from URL immediately to prevent re-triggering on remount/refresh
        const url = new URL(window.location.href)
        url.searchParams.delete('token')
        window.history.replaceState({}, '', url.pathname + url.search + url.hash)

        if (cleaned.length >= 4 && cleaned.length <= 10) {
          const relayUrl = deriveRelayUrl()
          get().connect(relayUrl, cleaned)
          return true
        }
      }

      // 2. Fall back to persisted session from localStorage
      const saved = loadSession()
      if (saved) {
        const relayUrl = saved.relayUrl || deriveRelayUrl()
        get().connect(relayUrl, saved.deviceCode)
        return true
      }

      return false
    } catch {
      return false
    }
  },
}))
