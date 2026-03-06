import React from 'react'
import { Menu, Wifi, WifiOff, Settings } from 'lucide-react'
import { useConversationStore } from '../../store/conversation-store'
import { useConnectionStore } from '../../api/connection-store'

interface Props {
  onOpenDrawer: () => void
  onOpenSettings: () => void
}

export function MobileHeader({ onOpenDrawer, onOpenSettings }: Props) {
  const { activeConversationId, conversations } = useConversationStore()
  const { status } = useConnectionStore()

  const activeConv = conversations.find((c) => c.id === activeConversationId)
  const title = activeConv?.title || 'GenUIClaw'
  const connected = status === 'connected'

  return (
    <div
      className="flex items-center gap-3 px-4 h-12 flex-shrink-0"
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <button
        onClick={onOpenDrawer}
        className="p-1.5 rounded-lg"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Menu size={20} />
      </button>

      <span
        className="flex-1 text-sm font-medium truncate"
        style={{ color: 'var(--text)' }}
      >
        {title}
      </span>

      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
          style={{
            background: connected ? 'var(--green)20' : 'var(--red)20',
            color: connected ? 'var(--green)' : 'var(--red)',
          }}
        >
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{connected ? 'Online' : 'Offline'}</span>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  )
}
