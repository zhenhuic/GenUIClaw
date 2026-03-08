import React from 'react'
import { Plus, Trash2, X, Smartphone, Monitor } from 'lucide-react'
import { useConversationStore } from '../../store/conversation-store'
import { useConnectionStore } from '../../api/connection-store'

interface Props {
  open: boolean
  onClose: () => void
}

export function ConversationDrawer({ open, onClose }: Props) {
  const {
    conversations,
    activeConversationId,
    selectConversation,
    createConversation,
    deleteConversation,
  } = useConversationStore()
  const { disconnect } = useConnectionStore()

  if (!open) return null

  const handleSelect = (id: string) => {
    selectConversation(id)
    onClose()
  }

  const handleNew = async () => {
    // If current conversation has no messages, stay on it
    const { messages } = useConversationStore.getState()
    if (messages.length === 0) {
      onClose()
      return
    }
    await createConversation('New Conversation')
    onClose()
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteConversation(id)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose} />

      {/* Drawer */}
      <div className="drawer">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Conversations
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* New conversation */}
        <button
          onClick={handleNew}
          className="flex items-center gap-2 mx-3 mb-2 px-3 py-2.5 rounded-lg text-sm transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={16} />
          New Conversation
        </button>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2">
          {conversations.map((conv) => {
            const isActive = conv.id === activeConversationId
            const isRemote = conv.source === 'remote'
            return (
              <div
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-0.5 cursor-pointer group"
                style={{
                  background: isActive ? 'var(--surface-hover)' : 'transparent',
                  color: isActive ? 'var(--text)' : 'var(--text-secondary)',
                }}
              >
                {isRemote ? (
                  <Smartphone size={12} className="flex-shrink-0" style={{ color: 'var(--blue)' }} />
                ) : (
                  <Monitor size={12} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                )}
                <span className="flex-1 text-sm truncate">{conv.title}</span>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="opacity-0 group-active:opacity-100 p-1 rounded"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>

        {/* Disconnect */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={disconnect}
            className="w-full py-2 rounded-lg text-xs"
            style={{ background: 'var(--surface)', color: 'var(--red)', border: '1px solid var(--border)' }}
          >
            Disconnect
          </button>
        </div>
      </div>
    </>
  )
}
