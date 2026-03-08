import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Wifi, WifiOff, Copy, Check, Zap, Loader2, Smartphone, Power, PowerOff, RefreshCw, ExternalLink } from 'lucide-react'
import { useSettingsStore } from '../../store/settings-store'
import type { RemoteStatus } from '@shared/types/ipc'

/**
 * Remote Control settings tab.
 *
 * Manages the relay connection, displays the device pairing code,
 * shows real-time connection status, and provides a test button
 * for the relay server URL with one-click enable on success.
 */
export function RemoteAccessSettings() {
  const { settings, update } = useSettingsStore()
  const remoteAccess = settings.remoteAccess ?? { enabled: false, relayUrl: '' }

  // Local UI state
  const [relayUrl, setRelayUrl] = useState(remoteAccess.relayUrl || '')
  const [status, setStatus] = useState<RemoteStatus>({
    relayConnected: false,
    deviceCode: '',
    mobileConnected: false,
    relayUrl: '',
  })
  const [copied, setCopied] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const urlInputRef = useRef<HTMLInputElement>(null)

  /** Compute the remote page URL with ?token= parameter */
  const remotePageUrl = useMemo(() => {
    if (!status.relayConnected || !status.deviceCode || !status.relayUrl) return ''
    try {
      // Convert ws(s):// to http(s)://
      let httpUrl = status.relayUrl
        .replace(/^wss:\/\//, 'https://')
        .replace(/^ws:\/\//, 'http://')
        .replace(/\/+$/, '')
      return `${httpUrl}/app/?token=${status.deviceCode}`
    } catch {
      return ''
    }
  }, [status.relayConnected, status.deviceCode, status.relayUrl])

  // Fetch initial status on mount
  useEffect(() => {
    window.electronAPI.remote.status().then((res) => {
      if (res.data) {
        setStatus(res.data)
        if (res.data.relayUrl) {
          setRelayUrl(res.data.relayUrl)
        }
      }
    })
  }, [])

  // Subscribe to real-time status pushes
  useEffect(() => {
    const unsub = window.electronAPI.remote.onStatusPush((newStatus) => {
      setStatus(newStatus)
    })
    return unsub
  }, [])

  // Sync relayUrl from settings when settings change externally
  useEffect(() => {
    if (remoteAccess.relayUrl && remoteAccess.relayUrl !== relayUrl && !status.relayConnected) {
      setRelayUrl(remoteAccess.relayUrl)
    }
  }, [remoteAccess.relayUrl])

  const handleStart = useCallback(async () => {
    if (!relayUrl.trim()) return
    setStarting(true)
    setError(null)
    setTestResult(null)
    try {
      const res = await window.electronAPI.remote.start(relayUrl.trim())
      if (res.error) {
        setError(res.error)
      } else {
        setStatus((prev) => ({
          ...prev,
          relayConnected: true,
          deviceCode: res.data!.deviceCode,
          relayUrl: relayUrl.trim(),
        }))
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setStarting(false)
    }
  }, [relayUrl])

  const handleStop = useCallback(async () => {
    setStopping(true)
    setError(null)
    try {
      const res = await window.electronAPI.remote.stop()
      if (res.error) {
        setError(res.error)
      } else {
        setStatus({
          relayConnected: false,
          deviceCode: '',
          mobileConnected: false,
          relayUrl: '',
        })
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setStopping(false)
    }
  }, [])

  const handleTest = useCallback(async () => {
    if (!relayUrl.trim()) return
    setTesting(true)
    setTestResult(null)
    setError(null)
    try {
      const res = await window.electronAPI.remote.test(relayUrl.trim())
      if (res.error) {
        setTestResult({ success: false, message: res.error })
      } else {
        setTestResult({ success: true, message: `Connected in ${res.data!.latencyMs}ms` })
      }
    } catch (err) {
      setTestResult({ success: false, message: (err as Error).message })
    } finally {
      setTesting(false)
    }
  }, [relayUrl])

  const handleTestAndEnable = useCallback(async () => {
    if (!relayUrl.trim()) return
    setTesting(true)
    setTestResult(null)
    setError(null)
    try {
      const res = await window.electronAPI.remote.test(relayUrl.trim())
      if (res.error) {
        setTestResult({ success: false, message: res.error })
        setTesting(false)
        return
      }
      setTestResult({ success: true, message: `Connected in ${res.data!.latencyMs}ms` })
      setTesting(false)
      // Auto-start after successful test
      await handleStart()
    } catch (err) {
      setTestResult({ success: false, message: (err as Error).message })
      setTesting(false)
    }
  }, [relayUrl, handleStart])

  const handleCopy = useCallback(() => {
    if (!status.deviceCode) return
    navigator.clipboard.writeText(status.deviceCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [status.deviceCode])

  const handleCopyUrl = useCallback(() => {
    if (!remotePageUrl) return
    navigator.clipboard.writeText(remotePageUrl).catch(() => {})
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }, [remotePageUrl])

  const handleRegenerate = useCallback(async () => {
    if (!status.relayConnected) return
    setRegenerating(true)
    setError(null)
    try {
      const res = await window.electronAPI.remote.regenerate()
      if (res.error) {
        setError(res.error)
      } else {
        setStatus((prev) => ({
          ...prev,
          deviceCode: res.data!.deviceCode,
        }))
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRegenerating(false)
    }
  }, [status.relayConnected])

  const handleUrlChange = useCallback((url: string) => {
    setRelayUrl(url)
    setTestResult(null)
    // Save URL to settings (but don't start relay yet)
    update({ remoteAccess: { ...remoteAccess, relayUrl: url } })
  }, [remoteAccess, update])

  const isActive = status.relayConnected

  return (
    <div className="flex flex-col gap-6">
      {/* Connection control */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Remote Control
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Allow mobile devices to connect and control this agent via a relay server
            </p>
          </div>
          {isActive ? (
            <button
              onClick={handleStop}
              disabled={stopping}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: 'var(--error-bg, #fef2f2)',
                color: 'var(--error, #ef4444)',
                border: '1px solid var(--error, #ef4444)',
                opacity: stopping ? 0.6 : 1,
              }}
            >
              {stopping ? <Loader2 size={12} className="animate-spin" /> : <PowerOff size={12} />}
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={starting || !relayUrl.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: starting || !relayUrl.trim() ? 'var(--border)' : 'var(--accent)',
                color: starting || !relayUrl.trim() ? 'var(--text-muted)' : '#fff',
                opacity: starting ? 0.6 : 1,
              }}
            >
              {starting ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Relay Server URL */}
      <div>
        <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Relay Server URL
        </p>
        <div className="flex gap-2">
          <input
            ref={urlInputRef}
            type="text"
            value={relayUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            disabled={isActive}
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none ui-input-focus"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: isActive ? 'var(--text-muted)' : 'var(--text)',
            }}
            placeholder="wss://relay.example.com"
          />
          <button
            onClick={handleTest}
            disabled={testing || !relayUrl.trim() || isActive}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: testing || !relayUrl.trim() || isActive ? 'var(--text-muted)' : 'var(--text)',
              opacity: testing ? 0.6 : 1,
            }}
          >
            {testing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            Test
          </button>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          The public relay server that bridges desktop and mobile connections
        </p>
        {/* Test result */}
        {testResult && (
          <div
            className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: testResult.success ? 'var(--success-bg, #f0fdf4)' : 'var(--error-bg, #fef2f2)',
              color: testResult.success ? 'var(--success, #22c55e)' : 'var(--error, #ef4444)',
              border: `1px solid ${testResult.success ? 'var(--success, #22c55e)' : 'var(--error, #ef4444)'}`,
            }}
          >
            {testResult.success ? <Check size={12} /> : <WifiOff size={12} />}
            <span>{testResult.message}</span>
            {testResult.success && !isActive && (
              <button
                onClick={handleStart}
                disabled={starting}
                className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                }}
              >
                {starting ? <Loader2 size={10} className="animate-spin" /> : <Power size={10} />}
                Enable Now
              </button>
            )}
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div>
        <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Status
        </p>
        <div
          className="flex flex-col gap-2 px-3 py-2.5 rounded-lg text-sm"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          {/* Relay connection status */}
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: isActive ? 'var(--success, #22c55e)' : 'var(--text-muted)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Relay:
            </span>
            <span className="text-xs font-medium" style={{ color: isActive ? 'var(--success, #22c55e)' : 'var(--text-muted)' }}>
              {isActive ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {/* Mobile connection status */}
          {isActive && (
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: status.mobileConnected ? 'var(--accent)' : 'var(--text-muted)' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Mobile:
              </span>
              <span className="text-xs font-medium" style={{ color: status.mobileConnected ? 'var(--accent)' : 'var(--text-muted)' }}>
                {status.mobileConnected ? 'Connected' : 'Waiting for connection...'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Device Pairing Code (only shown when relay is connected) */}
      {isActive && status.deviceCode && (
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
                Enter this code on your mobile device to pair
              </p>
              <p
                className="text-2xl font-mono font-bold tracking-[0.3em]"
                style={{ color: 'var(--accent)' }}
              >
                {status.deviceCode}
              </p>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                opacity: regenerating ? 0.6 : 1,
              }}
              title="Regenerate pairing code"
            >
              {regenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: copied ? 'var(--success, #22c55e)' : 'var(--text-secondary)',
              }}
              title="Copy code"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Remote Page URL (only shown when relay is connected) */}
      {isActive && remotePageUrl && (
        <div>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Remote Page URL
          </p>
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                Open this URL in a browser to access the remote chat page
              </p>
              <p
                className="text-xs font-mono truncate select-all"
                style={{ color: 'var(--accent)' }}
                title={remotePageUrl}
              >
                {remotePageUrl}
              </p>
            </div>
            <button
              onClick={handleCopyUrl}
              className="p-2 rounded-lg transition-colors flex-shrink-0"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: copiedUrl ? 'var(--success, #22c55e)' : 'var(--text-secondary)',
              }}
              title="Copy URL"
            >
              {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{
            background: 'var(--error-bg, #fef2f2)',
            color: 'var(--error, #ef4444)',
            border: '1px solid var(--error, #ef4444)',
          }}
        >
          <WifiOff size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
