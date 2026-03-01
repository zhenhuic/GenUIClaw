import React from 'react'
import type { AppMessage } from '../../../shared/types/conversation'
import { MessageBubble } from './MessageBubble'

interface Props {
  messages: AppMessage[]
}

export function MessageList({ messages }: Props) {
  if (messages.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3"
        style={{ color: 'var(--text-muted)' }}
      >
        <div className="text-4xl">✦</div>
        <p className="text-sm">What can I help you with?</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  )
}
