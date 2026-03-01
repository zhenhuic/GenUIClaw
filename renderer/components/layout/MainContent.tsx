import React from 'react'
import { ChatView } from '../chat/ChatView'
import { useConversationStore } from '../../store/conversation-store'

export function MainContent() {
  const { activeConversationId } = useConversationStore()

  if (!activeConversationId) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-4"
        style={{ background: 'var(--bg)' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          ✦
        </div>
        <div className="text-center">
          <p className="font-semibold" style={{ color: 'var(--text)' }}>
            Kaleidoscope
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Start a conversation or select one from the sidebar
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--bg)' }}>
      <ChatView />
    </div>
  )
}
