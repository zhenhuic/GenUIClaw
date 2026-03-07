import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowDown } from 'lucide-react'
import { MessageList } from './MessageList'
import { MobileInputBar } from './MobileInputBar'
import { useConversationStore } from '../../store/conversation-store'
import { useAgent } from '../../hooks/useAgent'

export function MobileChatView() {
  const { messages } = useConversationStore()
  const { sendMessage, interrupt, isRunning } = useAgent()
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [userScrolled, setUserScrolled] = useState(false)
  const isAutoScrollingRef = useRef(false)

  // Check if scrolled near bottom
  const isNearBottom = useCallback((): boolean => {
    const el = scrollContainerRef.current
    if (!el) return true
    const threshold = 80 // px from bottom
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }, [])

  // Handle user scroll: detect if they scrolled away from bottom
  const handleScroll = useCallback(() => {
    if (isAutoScrollingRef.current) return
    if (isNearBottom()) {
      setUserScrolled(false)
    } else {
      setUserScrolled(true)
    }
  }, [isNearBottom])

  // Auto-scroll to bottom when messages change, unless user scrolled up
  useEffect(() => {
    if (!userScrolled) {
      isAutoScrollingRef.current = true
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      // Reset flag after scroll animation
      setTimeout(() => {
        isAutoScrollingRef.current = false
      }, 300)
    }
  }, [messages, userScrolled])

  // Reset userScrolled when conversation changes (new messages array reference)
  const prevMessagesLenRef = useRef(0)
  useEffect(() => {
    if (messages.length === 0) {
      setUserScrolled(false)
    }
    prevMessagesLenRef.current = messages.length
  }, [messages.length])

  // Scroll to bottom and re-enable auto-follow
  const scrollToBottom = useCallback(() => {
    setUserScrolled(false)
    isAutoScrollingRef.current = true
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setTimeout(() => {
      isAutoScrollingRef.current = false
    }, 300)
  }, [])

  return (
    <div className="flex flex-col h-full relative">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-3 py-3"
        onScroll={handleScroll}
      >
        <MessageList messages={messages} />
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {userScrolled && isRunning && (
        <button
          onClick={scrollToBottom}
          className="absolute flex items-center justify-center rounded-full shadow-lg transition-all"
          style={{
            right: 16,
            bottom: 90,
            width: 40,
            height: 40,
            background: 'var(--accent)',
            color: '#fff',
            zIndex: 30,
            border: '2px solid var(--bg)',
          }}
        >
          <ArrowDown size={20} />
        </button>
      )}

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
