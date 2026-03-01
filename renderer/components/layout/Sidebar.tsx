import React from 'react'
import { Plus, MessageSquare, Trash2 } from 'lucide-react'
import { useConversationStore } from '../../store/conversation-store'

export function Sidebar() {
  const { conversations, activeConversationId, selectConversation, createConversation, deleteConversation } =
    useConversationStore()

  const handleNew = async () => {
    await createConversation('New Conversation')
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteConversation(id)
  }

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{
        width: 240,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* New conversation button */}
      <div className="p-3">
        <button
          onClick={handleNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            border: '1px solid var(--accent)30',
          }}
        >
          <Plus size={14} />
          New Conversation
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <div
            className="text-center py-8 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            No conversations yet
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
              className="group w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors relative"
              style={{
                background: conv.id === activeConversationId ? 'var(--surface)' : 'transparent',
                color: conv.id === activeConversationId ? 'var(--text)' : 'var(--text-secondary)',
                marginBottom: 2,
              }}
            >
              <MessageSquare size={13} className="flex-shrink-0" />
              <span className="flex-1 truncate">{conv.title}</span>
              <span
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                onClick={(e) => handleDelete(e, conv.id)}
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--red)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                }}
              >
                <Trash2 size={12} />
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
