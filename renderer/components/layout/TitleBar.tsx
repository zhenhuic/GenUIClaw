import React from 'react'
import { Settings } from 'lucide-react'

interface Props {
  onSettings: () => void
}

export function TitleBar({ onSettings }: Props) {
  return (
    <div
      className="drag-region flex items-center justify-between px-4 flex-shrink-0"
      style={{
        height: 48,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* macOS traffic lights space (left 72px) */}
      <div style={{ width: 72 }} />

      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--accent)' }}
        />
        <span
          className="text-sm font-semibold tracking-tight"
          style={{ color: 'var(--text-secondary)' }}
        >
          GenUIClaw
        </span>
      </div>

      <div className="no-drag">
        <button
          onClick={onSettings}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'var(--surface-hover)'
            el.style.color = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'transparent'
            el.style.color = 'var(--text-muted)'
          }}
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  )
}
