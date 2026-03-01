import React, { useState } from 'react'
import { Plus, Trash2, Server } from 'lucide-react'
import { useSettingsStore } from '../../store/settings-store'
import { MCPServerForm } from './MCPServerForm'
import type { McpServerConfig } from '../../../shared/types/settings'

export function MCPServerList() {
  const { settings, update } = useSettingsStore()
  const [showForm, setShowForm] = useState(false)
  const servers = Object.entries(settings.mcpServers)

  const handleAdd = async (name: string, config: McpServerConfig) => {
    await window.electronAPI.mcp.add(name, config)
    update({ mcpServers: { ...settings.mcpServers, [name]: config } })
    setShowForm(false)
  }

  const handleRemove = async (name: string) => {
    await window.electronAPI.mcp.remove(name)
    const next = { ...settings.mcpServers }
    delete next[name]
    update({ mcpServers: next })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Configure MCP servers to extend agent capabilities.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={14} />
          Add Server
        </button>
      </div>

      {servers.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-10 gap-2 rounded-xl"
          style={{ background: 'var(--surface-secondary)', border: '1px dashed var(--border)' }}
        >
          <Server size={24} style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No MCP servers configured
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {servers.map(([name, config]) => (
            <div
              key={name}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <Server size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium font-mono" style={{ color: 'var(--text)' }}>
                  {name}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {config.type === 'stdio'
                    ? `${config.command} ${config.args?.join(' ') ?? ''}`
                    : config.url}
                </p>
              </div>
              <button
                onClick={() => handleRemove(name)}
                className="p-1.5 rounded transition-colors flex-shrink-0"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.color = 'var(--red)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && <MCPServerForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />}
    </div>
  )
}
