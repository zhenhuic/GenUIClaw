/**
 * Connection lifecycle hook — monitors WebSocket state
 * and keeps the Zustand store in sync with the relay client.
 *
 * When the relay client auto-reconnects (internally), this hook
 * detects the state change and updates the store + re-installs the
 * remote API shim so all other hooks/stores keep working.
 */

import { useEffect } from 'react'
import { relayClient } from '../api/relay-ws-client'
import { useConnectionStore } from '../api/connection-store'
import { createRemoteAPI } from '../api/remote-api'

/**
 * Subscribes to relay client state changes.
 * Call once at the top of the connected app.
 */
export function useConnectionMonitor() {
  useEffect(() => {
    // Poll WebSocket readyState every 2s to detect drops / reconnections
    const interval = setInterval(() => {
      const state = useConnectionStore.getState()
      const storeConnected = state.status === 'connected'
      const wsConnected = relayClient.connected

      if (storeConnected && !wsConnected) {
        // Connection dropped — relay client will auto-reconnect internally
        useConnectionStore.setState({ status: 'connecting', error: 'Connection lost, reconnecting...' })
      }
      if (!storeConnected && wsConnected) {
        // Relay client reconnected successfully — re-install API shim and update store
        ;(window as any).electronAPI = createRemoteAPI(relayClient)
        useConnectionStore.setState({ status: 'connected', error: null })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])
}
