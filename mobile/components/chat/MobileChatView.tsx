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
  const inputBarRef = useRef<HTMLDivElement>(null)
  const [userScrolled, setUserScrolled] = useState(false)
  const isAutoScrollingRef = useRef(false)
  const [inputBarHeight, setInputBarHeight] = useState(0)

  // Measure input bar height for positioning scroll button above it
  useEffect(() => {
    const el = inputBarRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setInputBarHeight(entry.contentRect.height + 16) // +padding
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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

      {/* Scroll to bottom button — positioned above input bar, white/transparent bg */}
      {userScrolled && (
        <button
          onClick={scrollToBottom}
          className="absolute flex items-center justify-center rounded-full transition-all"
          style={{
            right: 16,
            bottom: Math.max(inputBarHeight + 16, 80),
            width: 36,
            height: 36,
            background: 'rgba(255, 255, 255, 0.9)',
            color: 'var(--text-secondary)',
            zIndex: 30,
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <ArrowDown size={18} />
        </button>
      )}

      <div
        ref={inputBarRef}
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
