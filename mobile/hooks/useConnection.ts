/**
 * Connection lifecycle hook — monitors WebSocket state
 * and exposes a reconnection banner status.
 */

import { useEffect } from 'react'
import { relayClient } from '../api/relay-ws-client'
import { useConnectionStore } from '../api/connection-store'

/**
 * Subscribes to relay client state changes.
 * Call once at the top of the connected app.
 */
export function useConnectionMonitor() {
  const setStatus = useConnectionStore.setState

  useEffect(() => {
    // Poll WebSocket readyState every 2s to detect drops
    const interval = setInterval(() => {
      const wasConnected = useConnectionStore.getState().status === 'connected'
      const isConnected = relayClient.connected

      if (wasConnected && !isConnected) {
        setStatus({ status: 'connecting', error: 'Connection lost, reconnecting...' })
      }
      if (!wasConnected && isConnected) {
        setStatus({ status: 'connected', error: null })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])
}
