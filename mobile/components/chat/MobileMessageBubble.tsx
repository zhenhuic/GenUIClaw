import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle, Terminal, Maximize2 } from 'lucide-react'
import type { AppMessage, MessageContentBlock, ToolCallBlock as ToolCallBlockType, UIRenderBlock } from '@shared/types/conversation'
import { UIRenderer } from '@generative-ui/UIRenderer'
import { useAgent } from '../../hooks/useAgent'
import { useUIDisplayStore } from '../../store/ui-display-store'

interface Props {
  message: AppMessage
}

export function MobileMessageBubble({ message }: Props) {
  const { sendUIAction } = useAgent()

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-sm text-sm"
          style={{ background: 'var(--accent)', color: '#fff', lineHeight: 1.6 }}
        >
          {getTextFromBlocks(message.content)}
        </div>
      </div>
    )
  }

  const hasContent = message.content.length > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          G
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          GenUIClaw
        </span>
      </div>

      <div className="pl-8 flex flex-col gap-2">
        {!hasContent && <StreamingIndicator />}
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
      <div className="prose text-sm" style={{ color: 'var(--text)', maxWidth: '100%' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.text}</ReactMarkdown>
      </div>
    )
  }

  if (block.type === 'tool_call') {
    return <MobileToolCallBlock block={block} />
  }

  if (block.type === 'ui_render') {
    return (
      <UIRenderContent
        block={block}
        sessionId={sessionId}
        onUIAction={onUIAction}
      />
    )
  }

  return null
}

/** Renders a UI block — inline or as a card that opens the bottom sheet. */
function UIRenderContent({
  block,
  sessionId,
  onUIAction,
}: {
  block: UIRenderBlock
  sessionId: string
  onUIAction: (renderBlockId: string, actionId: string, data: Record<string, unknown>) => void
}) {
  const { mode, openSheet } = useUIDisplayStore()

  if (mode === 'inline') {
    return (
      <div className="rounded-xl overflow-hidden my-1" style={{ border: '1px solid var(--border)' }}>
        <UIRenderer
          schema={block.schema}
          sessionId={sessionId}
          renderBlockId={block.renderBlockId}
          onAction={onUIAction}
        />
      </div>
    )
  }

  // Bottom sheet mode — show a compact card, tap to expand
  return (
    <button
      onClick={() => openSheet(block.renderBlockId, sessionId, block.schema)}
      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-sm my-1"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
      }}
    >
      <span style={{ fontSize: 16 }}>&#x2728;</span>
      <span className="flex-1">Interactive UI — tap to open</span>
      <Maximize2 size={14} style={{ color: 'var(--text-muted)' }} />
    </button>
  )
}

function MobileToolCallBlock({ block }: { block: ToolCallBlockType }) {
  const [expanded, setExpanded] = useState(false)

  const statusIcon =
    block.status === 'pending' ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--yellow)' }} /> :
    block.status === 'done' ? <CheckCircle2 size={14} style={{ color: 'var(--green)' }} /> :
    <XCircle size={14} style={{ color: 'var(--red)' }} />

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs"
        style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}
      >
        {statusIcon}
        <Terminal size={12} />
        <span className="font-mono font-medium">{block.toolName}</span>
        <span className="flex-1 truncate text-left" style={{ color: 'var(--text-muted)' }}>
          {getToolSummary(block)}
        </span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {expanded && (
        <div className="px-3 py-2 text-xs" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
          {block.input && (
            <div className="mb-2">
              <div className="font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Input</div>
              <pre className="text-xs overflow-x-auto" style={{ maxHeight: 150 }}>
                {typeof block.input === 'string' ? block.input : JSON.stringify(block.input, null, 2)}
              </pre>
            </div>
          )}
          {block.output != null && (
            <div>
              <div className="font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Output</div>
              <pre
                className="text-xs overflow-x-auto"
                style={{ maxHeight: 150, color: block.isError ? 'var(--red)' : undefined }}
              >
                {typeof block.output === 'string' ? block.output : JSON.stringify(block.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{ background: 'var(--text-muted)', animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function getTextFromBlocks(blocks: MessageContentBlock[]): string {
  return blocks.filter((b) => b.type === 'text').map((b) => (b as { type: 'text'; text: string }).text).join('')
}

function getToolSummary(block: ToolCallBlockType): string {
  const input = block.input as Record<string, unknown> | undefined
  if (!input) return ''
  switch (block.toolName) {
    case 'Bash': return (input.command as string || '').slice(0, 60)
    case 'Read': case 'Write': case 'Edit': return (input.filePath as string || input.file_path as string || '')
    case 'Glob': return (input.pattern as string || '')
    case 'Grep': return (input.pattern as string || '')
    case 'WebFetch': return (input.url as string || '')
    default: return ''
  }
}
