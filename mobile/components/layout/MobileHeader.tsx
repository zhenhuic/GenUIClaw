import React from 'react'
import { Menu, Plus, Wifi, WifiOff, Settings } from 'lucide-react'
import { useConversationStore } from '../../store/conversation-store'
import { useConnectionStore } from '../../api/connection-store'

interface Props {
  onOpenDrawer: () => void
  onOpenSettings: () => void
}

export function MobileHeader({ onOpenDrawer, onOpenSettings }: Props) {
  const { messages, createConversation } = useConversationStore()
  const { status } = useConnectionStore()

  const connected = status === 'connected'

  const handleNew = async () => {
    // If current conversation has no messages, stay on it
    if (messages.length === 0) return
    await createConversation('New Conversation')
  }

  return (
    <div
      className="mobile-header flex flex-col flex-shrink-0"
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 h-12">
        <button
          onClick={onOpenDrawer}
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Menu size={20} />
        </button>

        <button
          onClick={handleNew}
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Plus size={20} />
        </button>

        {/* Center: GenUIClaw title */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <span
            className="text-sm font-bold tracking-wide"
            style={{ color: 'var(--text)' }}
          >
            GenUIClaw
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
            style={{
              background: connected ? 'var(--green)20' : 'var(--red)20',
              color: connected ? 'var(--green)' : 'var(--red)',
            }}
          >
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
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
    </div>
  )
}
