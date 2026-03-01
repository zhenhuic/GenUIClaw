import React, { useEffect, useRef } from 'react'
import { MessageList } from './MessageList'
import { InputBar } from './InputBar'
import { useConversationStore } from '../../store/conversation-store'
import { useAgent } from '../../hooks/useAgent'

export function ChatView() {
  const { messages } = useConversationStore()
  const { sendMessage, interrupt, isRunning } = useAgent()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <MessageList messages={messages} />
          <div ref={bottomRef} />
        </div>
      </div>

      <div
        className="flex-shrink-0 px-4 pb-4"
        style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}
      >
        <div className="max-w-3xl mx-auto">
          <InputBar
            onSend={sendMessage}
            onInterrupt={interrupt}
            isRunning={isRunning}
          />
        </div>
      </div>
    </div>
  )
}
