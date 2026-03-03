import React, { useState, useEffect } from 'react'
import { RefreshCw, Copy, Wifi, WifiOff, Loader } from 'lucide-react'
import { useSettingsStore } from '../../store/settings-store'
import type { RemoteControlStatus } from '../../../shared/types/ipc'

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 12px',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

const btnStyle: React.CSSProperties = {
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  padding: '8px 12px',
  cursor: 'pointer',
  fontSize: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexShrink: 0,
  whiteSpace: 'nowrap' as const,
}

function StatusIndicator({ status }: { status: RemoteControlStatus }) {
  const colorMap: Record<RemoteControlStatus['state'], string> = {
    disabled: 'var(--text-muted)',
    connecting: '#f59e0b',
    connected: '#10b981',
    disconnected: 'var(--red)',
    reconnecting: '#f59e0b',
  }

  const labelMap: Record<RemoteControlStatus['state'], string> = {
    disabled: 'Disabled',
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnected:
      status.state === 'disconnected' && status.error ? `Disconnected (${status.error})` : 'Disconnected',
    reconnecting: `Reconnecting (attempt ${'attempt' in status ? status.attempt : 1})...`,
  }

  const iconMap: Record<RemoteControlStatus['state'], React.ReactNode> = {
    disabled: <WifiOff size={14} />,
    connecting: <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />,
    connected: <Wifi size={14} />,
    disconnected: <WifiOff size={14} />,
    reconnecting: <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: colorMap[status.state] }}>{iconMap[status.state]}</span>
      <span style={{ fontSize: 13, color: colorMap[status.state] }}>{labelMap[status.state]}</span>
    </div>
  )
}

function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{label}</p>
        {description && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

export function RemoteControlSettings() {
  const { settings, update } = useSettingsStore()
  const rc = settings.remoteControl ?? { enabled: false, serverUrl: '', pairingKey: '' }

  const [connectionStatus, setConnectionStatus] = useState<RemoteControlStatus>({ state: 'disabled' })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.electronAPI.remoteControl.getStatus().then((result) => {
      const r = result as { data?: RemoteControlStatus }
      if (r?.data) setConnectionStatus(r.data)
    })

    const cleanup = window.electronAPI.remoteControl.onStatusChange((status) => {
      setConnectionStatus(status)
    })
    return cleanup
  }, [])

  const handleToggleEnabled = (enabled: boolean) => {
    update({ remoteControl: { ...rc, enabled } })
  }

  const handleServerUrlChange = (serverUrl: string) => {
    update({ remoteControl: { ...rc, serverUrl } })
  }

  const handleRegenKey = async () => {
    const result = await window.electronAPI.remoteControl.regenKey()
    const r = result as { data?: { pairingKey: string } }
    if (r?.data?.pairingKey) {
      update({ remoteControl: { ...rc, pairingKey: r.data.pairingKey } })
    }
  }

  const handleCopyKey = () => {
    if (rc.pairingKey) {
      navigator.clipboard.writeText(rc.pairingKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isInsecureUrl =
    rc.serverUrl.startsWith('ws://') &&
    !rc.serverUrl.includes('localhost') &&
    !rc.serverUrl.includes('127.0.0.1')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Enable toggle */}
      <Field
        label="Enable Remote Control"
        description="Allow remote users to control this agent via a relay server."
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rc.enabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
          />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Enabled</span>
        </label>
      </Field>

      {/* Server URL */}
      <Field
        label="Relay Server URL"
        description="WebSocket URL of your relay server (e.g. wss://my-relay.example.com)."
      >
        <input
          type="text"
          value={rc.serverUrl}
          onChange={(e) => handleServerUrlChange(e.target.value)}
          placeholder="wss://my-relay.example.com"
          style={{ ...inputStyle, opacity: rc.enabled ? 1 : 0.5 }}
          disabled={!rc.enabled}
        />
        {isInsecureUrl && (
          <p style={{ fontSize: 12, color: '#f59e0b', margin: '4px 0 0 0' }}>
            Warning: Using an unencrypted WebSocket connection (ws://). Use wss:// in production to protect your pairing key.
          </p>
        )}
      </Field>

      {/* Pairing Key */}
      <Field
        label="Pairing Key"
        description="Share this key when adding a remote agent in the web interface."
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={rc.pairingKey || '(not set — save settings to generate)'}
            readOnly
            style={{
              ...inputStyle,
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: 'default',
              flex: 1,
            }}
          />
          <button onClick={handleCopyKey} disabled={!rc.pairingKey} style={btnStyle} title="Copy key">
            {copied ? 'Copied!' : <><Copy size={13} /> Copy</>}
          </button>
          <button onClick={handleRegenKey} style={btnStyle} title="Generate new key">
            <RefreshCw size={13} /> Regenerate
          </button>
        </div>
      </Field>

      {/* Connection Status */}
      <Field label="Connection Status">
        <StatusIndicator status={connectionStatus} />
      </Field>

      {/* Instructions */}
      <div
        style={{
          background: 'var(--surface-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '12px 14px',
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: '0 0 6px 0' }}>
          How to connect
        </p>
        <ol style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
          <li>Start your relay server and note its WebSocket URL.</li>
          <li>Enable Remote Control and enter the relay URL above.</li>
          <li>Copy your Pairing Key.</li>
          <li>Open the relay web interface, register/login, and add a new Remote Agent using the Pairing Key.</li>
          <li>Once paired, you can chat with this agent from any browser.</li>
        </ol>
      </div>
    </div>
  )
}
