import React, { useEffect, useState, useCallback } from 'react'
import { Wifi, WifiOff, RefreshCw, Copy, Check } from 'lucide-react'
import { useSettingsStore } from '../../store/settings-store'

/**
 * Remote Access settings tab.
 *
 * Manages the relay connection toggle, displays the device pairing code,
 * and shows connected mobile client status.
 *
 * NOTE: The actual relay connection lifecycle is managed in main/index.ts.
 * This component only reads/writes the `remoteAccess` setting.
 * A full restart (or IPC event) is needed to activate the relay client
 * after toggling the setting.
 */
export function RemoteAccessSettings() {
  const { settings, update } = useSettingsStore()
  const remoteAccess = settings.remoteAccess ?? { enabled: false, relayUrl: 'wss://relay.genuiclaw.example.com' }
  const [copied, setCopied] = useState(false)

  const handleToggle = useCallback(
    (enabled: boolean) => {
      update({ remoteAccess: { ...remoteAccess, enabled } })
    },
    [remoteAccess, update]
  )

  const handleUrlChange = useCallback(
    (url: string) => {
      update({ remoteAccess: { ...remoteAccess, relayUrl: url } })
    },
    [remoteAccess, update]
  )

  const handleCopy = () => {
    // In a real implementation, the device code would come from the main process
    // via an IPC call. For now we show a placeholder.
    navigator.clipboard.writeText('(device code)').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Enable toggle */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Enable Remote Access
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Allow mobile devices to connect and control this agent
            </p>
          </div>
          <button
            onClick={() => handleToggle(!remoteAccess.enabled)}
            className="relative w-10 h-5 rounded-full transition-colors"
            style={{
              background: remoteAccess.enabled ? 'var(--accent)' : 'var(--border)',
            }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
              style={{
                transform: remoteAccess.enabled ? 'translateX(22px)' : 'translateX(2px)',
              }}
            />
          </button>
        </div>
      </div>

      {remoteAccess.enabled && (
        <>
          {/* Device code display */}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Device Pairing Code
            </p>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="flex-1">
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Enter this code on your mobile device
                </p>
                <p
                  className="text-2xl font-mono font-bold tracking-[0.3em]"
                  style={{ color: 'var(--accent)' }}
                >
                  ------
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Code will appear after relay connects. Restart app to activate.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg transition-colors"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  title="Copy code"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Relay URL */}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Relay Server URL
            </p>
            <input
              type="text"
              value={remoteAccess.relayUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none ui-input-focus"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              placeholder="wss://relay.example.com"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              The public relay server that bridges desktop and mobile connections
            </p>
          </div>

          {/* Connection status */}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Status
            </p>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <WifiOff size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>
                Not connected — restart app to activate relay
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
