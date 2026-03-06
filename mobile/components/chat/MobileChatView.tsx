import React, { useEffect, useRef } from 'react'
import { MessageList } from './MessageList'
import { MobileInputBar } from './MobileInputBar'
import { useConversationStore } from '../../store/conversation-store'
import { useAgent } from '../../hooks/useAgent'

export function MobileChatView() {
  const { messages } = useConversationStore()
  const { sendMessage, interrupt, isRunning } = useAgent()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <MessageList messages={messages} />
        <div ref={bottomRef} />
      </div>

      <div
        className="flex-shrink-0 px-3 pb-3"
        style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}
      >
        <MobileInputBar
          onSend={sendMessage}
          onInterrupt={interrupt}
          isRunning={isRunning}
        />
      </div>
    </div>
  )
}
