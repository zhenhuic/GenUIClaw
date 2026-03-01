import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AppMessage, MessageContentBlock } from '../../../shared/types/conversation'
import { ToolCallBlock } from './ToolCallBlock'
import { UIRenderer } from '../generative-ui/UIRenderer'
import { useAgent } from '../../hooks/useAgent'

interface Props {
  message: AppMessage
}

export function MessageBubble({ message }: Props) {
  const { sendUIAction } = useAgent()

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="selectable max-w-lg px-4 py-3 rounded-2xl rounded-br-sm text-sm"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            lineHeight: 1.6,
          }}
        >
          {getTextFromBlocks(message.content)}
        </div>
      </div>
    )
  }

  // Assistant message — may contain text, tool calls, and UI blocks
  const hasContent = message.content.length > 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          K
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Kaleidoscope
        </span>
      </div>

      <div className="pl-8 flex flex-col gap-3">
        {!hasContent && (
          <StreamingIndicator />
        )}
        {message.content.map((block, i) => (
          <ContentBlock
            key={i}
            block={block}
            sessionId={message.sessionId ?? ''}
            onUIAction={sendUIAction}
          />
        ))}
      </div>
    </div>
  )
}

function ContentBlock({
  block,
  sessionId,
  onUIAction,
}: {
  block: MessageContentBlock
  sessionId: string
  onUIAction: (renderBlockId: string, actionId: string, data: Record<string, unknown>) => void
}) {
  if (block.type === 'text') {
    if (!block.text) return null
    return (
      <div
        className="selectable prose text-sm"
        style={{ color: 'var(--text)', maxWidth: '100%' }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.text}</ReactMarkdown>
      </div>
    )
  }

  if (block.type === 'tool_call') {
    return <ToolCallBlock block={block} />
  }

  if (block.type === 'ui_render') {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ fontSize: 16 }}>&#x2728;</span>
        <span>Dynamic UI opened in a new window</span>
      </div>
    )
  }

  return null
}

function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{
            background: 'var(--text-muted)',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  )
}

function getTextFromBlocks(blocks: MessageContentBlock[]): string {
  return blocks
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
}
