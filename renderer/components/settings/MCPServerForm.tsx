import React, { useState } from 'react'
import type { McpServerConfig } from '../../../shared/types/settings'

interface Props {
  onAdd: (name: string, config: McpServerConfig) => void
  onCancel: () => void
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '7px 11px',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

export function MCPServerForm({ onAdd, onCancel }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'stdio' | 'sse'>('stdio')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [url, setUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const config: McpServerConfig =
      type === 'stdio'
        ? {
            type: 'stdio',
            command: command.trim(),
            args: args.trim() ? args.trim().split(/\s+/) : [],
          }
        : {
            type: 'sse',
            url: url.trim(),
          }

    onAdd(name.trim(), config)
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: 'var(--surface-secondary)', border: '1px solid var(--accent)30' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
        Add MCP Server
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-server"
            style={inputStyle}
            className="selectable"
            required
          />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
            Transport Type
          </label>
          <select value={type} onChange={(e) => setType(e.target.value as 'stdio' | 'sse')} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="stdio">stdio (local process)</option>
            <option value="sse">SSE (HTTP server)</option>
          </select>
        </div>

        {type === 'stdio' ? (
          <>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                Command
              </label>
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="npx"
                style={inputStyle}
                className="selectable"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                Arguments (space separated)
              </label>
              <input
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder="-y @modelcontextprotocol/server-filesystem /tmp"
                style={inputStyle}
                className="selectable"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Server URL
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:3000/sse"
              style={inputStyle}
              className="selectable"
              required
            />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-sm"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
