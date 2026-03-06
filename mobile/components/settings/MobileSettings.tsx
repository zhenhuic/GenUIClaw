import React from 'react'
import { Monitor, Layers, X } from 'lucide-react'
import { useUIDisplayStore, type UIDisplayMode } from '../../store/ui-display-store'
import { useConnectionStore } from '../../api/connection-store'

interface Props {
  open: boolean
  onClose: () => void
}

const MODES: { value: UIDisplayMode; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'inline',
    label: 'Inline',
    desc: 'Render interactive UI directly in the chat stream',
    icon: <Layers size={18} />,
  },
  {
    value: 'bottomsheet',
    label: 'Bottom Sheet',
    desc: 'Open interactive UI in a draggable bottom panel',
    icon: <Monitor size={18} />,
  },
]

export function MobileSettings({ open, onClose }: Props) {
  const { mode, setMode } = useUIDisplayStore()
  const { status, deviceCode, relayUrl } = useConnectionStore()

  if (!open) return null

  return (
    <>
      <div className="bottom-sheet-backdrop" onClick={onClose} />
      <div className="bottom-sheet" style={{ height: '60vh' }}>
        <div className="flex justify-center pt-2 pb-1">
          <div className="bottom-sheet-handle" />
        </div>

        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Settings
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="bottom-sheet-content">
          {/* Connection info */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Connection
            </h3>
            <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Status</span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: status === 'connected' ? 'var(--green)20' : 'var(--red)20',
                    color: status === 'connected' ? 'var(--green)' : 'var(--red)',
                  }}
                >
                  {status === 'connected' ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Device Code</span>
                <span className="text-xs font-mono font-bold" style={{ color: 'var(--text)' }}>
                  {deviceCode || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Relay</span>
                <span className="text-xs truncate ml-4" style={{ color: 'var(--text-muted)', maxWidth: 180 }}>
                  {relayUrl}
                </span>
              </div>
            </div>
          </section>

          {/* UI Display Mode */}
          <section className="mb-6">
            <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Generative UI Display
            </h3>
            <div className="flex flex-col gap-2">
              {MODES.map((m) => {
                const active = mode === m.value
                return (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    className="flex items-start gap-3 p-3 rounded-xl text-left transition-colors"
                    style={{
                      background: active ? 'var(--accent-dim)' : 'var(--surface)',
                      border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    <div
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      {m.icon}
                    </div>
                    <div>
                      <div
                        className="text-sm font-medium"
                        style={{ color: active ? 'var(--accent)' : 'var(--text)' }}
                      >
                        {m.label}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {m.desc}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
