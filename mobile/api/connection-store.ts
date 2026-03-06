/**
 * Connection state — tracks the relay connection lifecycle.
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

  connect: (relayUrl: string, deviceCode: string) => Promise<void>
  disconnect: () => void
}

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

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'disconnected',
  deviceCode: '',
  relayUrl: DEFAULT_RELAY_URL,
  error: null,

  connect: async (relayUrl: string, deviceCode: string) => {
    const code = deviceCode.trim().toUpperCase()
    if (!code) {
      set({ error: 'Please enter a device code' })
      return
    }

    set({ status: 'connecting', deviceCode: code, relayUrl, error: null })

    try {
      await relayClient.connect(relayUrl, code)

      // Install the remote API as window.electronAPI so all stores/hooks work
      ;(window as any).electronAPI = createRemoteAPI(relayClient)

      set({ status: 'connected', error: null })
    } catch (err) {
      set({ status: 'error', error: (err as Error).message })
    }
  },

  disconnect: () => {
    relayClient.disconnect()
    set({ status: 'disconnected', deviceCode: '', error: null })
  },
}))
