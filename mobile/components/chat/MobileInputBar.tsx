import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square } from 'lucide-react'

interface Props {
  onSend: (text: string) => void
  onInterrupt: () => void
  isRunning: boolean
}

export function MobileInputBar({ onSend, onInterrupt, isRunning }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [value])

  const handleSend = useCallback(() => {
    const text = value.trim()
    if (!text || isRunning) return
    setValue('')
    onSend(text)
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isRunning, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // On mobile, Enter sends (no shift+enter for newline — mobile keyboards differ)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="flex items-end gap-2 p-2 rounded-2xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isRunning ? 'Agent is working...' : 'Message...'}
        disabled={isRunning}
        rows={1}
        className="flex-1 resize-none outline-none text-sm bg-transparent"
        style={{
          color: 'var(--text)',
          lineHeight: 1.6,
          minHeight: 24,
          maxHeight: 120,
          fontFamily: 'inherit',
          fontSize: '16px', // Prevent iOS zoom
        }}
      />

      {isRunning ? (
        <button
          onClick={onInterrupt}
          className="flex-shrink-0 p-2.5 rounded-xl transition-colors"
          style={{ background: 'var(--red)', color: '#fff' }}
        >
          <Square size={16} />
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!value.trim()}
          className="flex-shrink-0 p-2.5 rounded-xl transition-colors"
          style={{
            background: value.trim() ? 'var(--accent)' : 'var(--surface-secondary)',
            color: value.trim() ? '#fff' : 'var(--text-muted)',
          }}
        >
          <Send size={16} />
        </button>
      )}
    </div>
  )
}
