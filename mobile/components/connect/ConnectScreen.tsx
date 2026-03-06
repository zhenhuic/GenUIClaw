import React, { useState, useRef, useEffect } from 'react'
import { useConnectionStore } from '../../api/connection-store'

export function ConnectScreen() {
  const { status, error, connect, relayUrl: defaultRelayUrl } = useConnectionStore()
  const [code, setCode] = useState('')
  const [relayUrl, setRelayUrl] = useState(defaultRelayUrl)
  const inputRef = useRef<HTMLInputElement>(null)
  const isConnecting = status === 'connecting'

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleCodeChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setCode(cleaned)

    // Auto-submit when 6 characters entered
    if (cleaned.length === 6) {
      connect(relayUrl, cleaned)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setCode(pasted)
    if (pasted.length === 6) {
      connect(relayUrl, pasted)
    }
  }

  const handleSubmit = () => {
    if (code.length === 6) {
      connect(relayUrl, code)
    }
  }

  return (
    <div
      className="flex flex-col items-center h-full px-6 overflow-y-auto"
      style={{ background: 'var(--bg)', paddingTop: 'max(60px, calc(env(safe-area-inset-top) + 40px))' }}
    >
      {/* Logo */}
      <div
        className="flex-shrink-0 rounded-2xl flex items-center justify-center font-bold"
        style={{
          width: 56,
          height: 56,
          fontSize: 22,
          background: 'var(--accent)',
          color: '#fff',
          marginBottom: 16,
        }}
      >
        G
      </div>

      <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>
        GenUIClaw Remote
      </h1>
      <p className="text-sm mb-8 text-center px-4" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        Enter the 6-digit device code shown on your desktop app
      </p>

      {/* Single text input for device code */}
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={6}
        value={code}
        onChange={(e) => handleCodeChange(e.target.value)}
        onPaste={handlePaste}
        disabled={isConnecting}
        placeholder="XXXXXX"
        className="outline-none text-center font-mono font-bold tracking-[0.35em] rounded-2xl w-full transition-colors"
        style={{
          maxWidth: 280,
          height: 60,
          fontSize: 28,
          lineHeight: '60px',
          background: 'var(--surface)',
          border: `2px solid ${code.length === 6 ? 'var(--accent)' : 'var(--border)'}`,
          color: 'var(--text)',
          caretColor: 'var(--accent)',
          marginBottom: 20,
        }}
      />

      {/* Error */}
      {error && (
        <p className="text-sm mb-4 text-center px-4" style={{ color: 'var(--red)', lineHeight: 1.4 }}>
          {error}
        </p>
      )}

      {/* Connect button */}
      <button
        onClick={handleSubmit}
        disabled={isConnecting || code.length < 6}
        className="w-full rounded-2xl font-medium transition-all active:scale-[0.97]"
        style={{
          maxWidth: 280,
          height: 52,
          fontSize: 16,
          background: isConnecting || code.length < 6 ? 'var(--surface-secondary)' : 'var(--accent)',
          color: isConnecting || code.length < 6 ? 'var(--text-muted)' : '#fff',
          border: 'none',
          cursor: isConnecting || code.length < 6 ? 'default' : 'pointer',
        }}
      >
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>

      {/* Relay URL */}
      <details className="mt-10 w-full" style={{ maxWidth: 280 }}>
        <summary
          className="text-xs cursor-pointer select-none py-2"
          style={{ color: 'var(--text-muted)' }}
        >
          Relay server URL
        </summary>
        <input
          type="url"
          value={relayUrl}
          onChange={(e) => setRelayUrl(e.target.value)}
          className="mt-1 w-full px-4 py-3 rounded-xl text-sm outline-none ui-input-focus"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontSize: 14,
          }}
        />
      </details>
    </div>
  )
}
