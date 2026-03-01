import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Terminal, CheckCircle, XCircle, Loader } from 'lucide-react'
import type { ToolCallBlock as ToolCallBlockType } from '../../../shared/types/conversation'

interface Props {
  block: ToolCallBlockType
}

export function ToolCallBlock({ block }: Props) {
  const [expanded, setExpanded] = useState(false)

  const statusIcon = {
    pending: <Loader size={13} className="animate-spin" style={{ color: 'var(--yellow)' }} />,
    done: <CheckCircle size={13} style={{ color: 'var(--green)' }} />,
    error: <XCircle size={13} style={{ color: 'var(--red)' }} />,
  }[block.status]

  const inputStr = formatJSON(block.input)
  const outputStr = block.output ? formatJSON(block.output) : null

  return (
    <div
      className="rounded-lg overflow-hidden text-xs"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.background = 'transparent')
        }
      >
        {statusIcon}
        <Terminal size={12} style={{ color: 'var(--text-muted)' }} />
        <span className="font-mono font-medium" style={{ color: 'var(--text)' }}>
          {block.toolName}
        </span>
        <span
          className="flex-1 truncate"
          style={{ color: 'var(--text-muted)' }}
        >
          {getToolSummary(block.toolName, block.input)}
        </span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div
          className="border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          {inputStr && (
            <div className="px-3 py-2">
              <div
                className="text-xs mb-1 font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Input
              </div>
              <pre
                className="selectable text-xs overflow-x-auto p-2 rounded"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  border: 'none',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                {inputStr}
              </pre>
            </div>
          )}
          {outputStr && (
            <div className="px-3 pb-2">
              <div
                className="text-xs mb-1 font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Output
              </div>
              <pre
                className="selectable text-xs overflow-x-auto p-2 rounded"
                style={{
                  background: 'var(--bg-secondary)',
                  color: block.isError ? 'var(--red)' : 'var(--text-secondary)',
                  margin: 0,
                  border: 'none',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  lineHeight: 1.5,
                  maxHeight: 200,
                }}
              >
                {outputStr}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatJSON(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function getToolSummary(toolName: string, input: unknown): string {
  if (!input || typeof input !== 'object') return ''
  const inp = input as Record<string, unknown>

  switch (toolName) {
    case 'Bash':
      return typeof inp.command === 'string' ? inp.command.slice(0, 60) : ''
    case 'Read':
    case 'Write':
    case 'Edit':
      return typeof inp.file_path === 'string' ? inp.file_path : ''
    case 'Glob':
      return typeof inp.pattern === 'string' ? inp.pattern : ''
    case 'Grep':
      return typeof inp.pattern === 'string' ? inp.pattern : ''
    case 'WebFetch':
      return typeof inp.url === 'string' ? inp.url.slice(0, 60) : ''
    default:
      return ''
  }
}
