import React from 'react'
import { Sparkles } from 'lucide-react'
import type { AppMessage } from '@shared/types/conversation'
import { MobileMessageBubble } from './MobileMessageBubble'

interface Props {
  messages: AppMessage[]
}

export function MessageList({ messages }: Props) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
        <Sparkles size={28} style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          What can I help you with?
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map((msg) => (
        <MobileMessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  )
}
