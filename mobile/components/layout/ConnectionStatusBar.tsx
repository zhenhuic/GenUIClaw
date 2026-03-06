import React from 'react'
import { useConnectionStore } from '../../api/connection-store'

/**
 * A fixed banner at the top of the screen when the connection drops.
 * Invisible when connected.
 */
export function ConnectionStatusBar() {
  const { status, error } = useConnectionStore()

  if (status === 'connected' || status === 'disconnected') return null

  const isError = status === 'error'

  return (
    <div className={`connection-bar ${isError ? 'error' : 'reconnecting'}`}>
      {isError
        ? `Connection error: ${error || 'Unknown'}`
        : 'Reconnecting to desktop...'}
    </div>
  )
}
