import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown, ChevronRight, Minimize2 } from 'lucide-react'
import { UIRenderer } from '../generative-ui/UIRenderer'
import type { AppMessage, MessageContentBlock } from '../../types'

interface MessageBubbleProps {
  message: AppMessage
  onUIAction: (renderBlockId: string, actionId: string, data: Record<string, unknown>) => void
  onMinimizeUI: (renderBlockId: string, title: string) => void
}

export function MessageBubble({ message, onUIAction, onMinimizeUI }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: '#3b82f6', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
          flexShrink: 0, marginRight: 8, marginTop: 2,
        }}>
          G
        </div>
      )}
      <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {message.content.map((block, i) => (
          <ContentBlockView
            key={i}
            block={block}
            isUser={isUser}
            onUIAction={onUIAction}
            onMinimizeUI={onMinimizeUI}
          />
        ))}
        {message.content.length === 0 && !isUser && (
          <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>Thinking...</div>
        )}
      </div>
    </div>
  )
}

interface ContentBlockViewProps {
  block: MessageContentBlock
  isUser: boolean
  onUIAction: (renderBlockId: string, actionId: string, data: Record<string, unknown>) => void
  onMinimizeUI: (renderBlockId: string, title: string) => void
}

function ContentBlockView({ block, isUser, onUIAction, onMinimizeUI }: ContentBlockViewProps) {
  if (block.type === 'text') {
    return (
      <div style={{
        background: isUser ? '#3b82f6' : '#f3f4f6',
        color: isUser ? '#fff' : '#111827',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: '10px 14px',
        fontSize: 14,
        lineHeight: 1.6,
      }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.text}</ReactMarkdown>
      </div>
    )
  }

  if (block.type === 'tool_call') {
    return <ToolCallBlock block={block} />
  }

  if (block.type === 'ui_render') {
    const title = block.schema.components[block.schema.rootId]?.type ?? 'Dynamic UI'
    return (
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#fff',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>Dynamic UI</span>
          <button
            onClick={() => onMinimizeUI(block.renderBlockId, title)}
            title="Minimize to tile"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af', display: 'flex', alignItems: 'center' }}
          >
            <Minimize2 size={14} />
          </button>
        </div>
        <div style={{ padding: 16 }}>
          <UIRenderer
            schema={block.schema}
            renderBlockId={block.renderBlockId}
            onAction={(actionId, data) => onUIAction(block.renderBlockId, actionId, data)}
          />
        </div>
      </div>
    )
  }

  return null
}

function ToolCallBlock({ block }: { block: MessageContentBlock & { type: 'tool_call' } }) {
  const [open, setOpen] = useState(false)
  const isPending = block.status === 'pending'
  const isError = block.status === 'error'

  return (
    <div style={{
      border: `1px solid ${isError ? '#fca5a5' : '#e5e7eb'}`,
      borderRadius: 8,
      overflow: 'hidden',
      fontSize: 13,
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '8px 12px', background: isError ? '#fef2f2' : '#f9fafb',
          border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        {isPending ? (
          <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #3b82f6', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
        ) : isError ? (
          <span style={{ color: '#ef4444', fontWeight: 700 }}>✗</span>
        ) : (
          <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
        )}
        <span style={{ fontWeight: 500, color: '#374151' }}>{block.toolName}</span>
        {open ? <ChevronDown size={12} style={{ marginLeft: 'auto' }} /> : <ChevronRight size={12} style={{ marginLeft: 'auto' }} />}
      </button>
      {open && (
        <div style={{ padding: '8px 12px', background: '#fff', borderTop: '1px solid #e5e7eb' }}>
          <pre style={{ fontSize: 11, overflow: 'auto', margin: 0, color: '#374151' }}>
            {JSON.stringify(block.input, null, 2)}
          </pre>
          {block.output && (
            <>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', margin: '8px 0 4px' }}>Output:</div>
              <pre style={{ fontSize: 11, overflow: 'auto', margin: 0, color: isError ? '#ef4444' : '#374151' }}>
                {typeof block.output === 'string' ? block.output : JSON.stringify(block.output, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}
