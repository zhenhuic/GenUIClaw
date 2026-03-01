import React from 'react'
import { useSettingsStore } from '../../store/settings-store'

const ALL_TOOLS = [
  { id: 'Bash', label: 'Bash', description: 'Execute shell commands' },
  { id: 'Read', label: 'Read', description: 'Read files from disk' },
  { id: 'Write', label: 'Write', description: 'Write files to disk' },
  { id: 'Edit', label: 'Edit', description: 'Edit existing files' },
  { id: 'Glob', label: 'Glob', description: 'Find files by pattern' },
  { id: 'Grep', label: 'Grep', description: 'Search file contents' },
  { id: 'WebFetch', label: 'WebFetch', description: 'Fetch web pages' },
  { id: 'WebSearch', label: 'WebSearch', description: 'Search the web' },
]

export function ToolSettings() {
  const { settings, update } = useSettingsStore()

  const toggleTool = (toolId: string) => {
    const current = new Set(settings.allowedTools)
    if (current.has(toolId)) {
      current.delete(toolId)
    } else {
      current.add(toolId)
    }
    update({ allowedTools: Array.from(current) })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Select which built-in tools the agent is allowed to use.
      </p>

      <div className="flex flex-col gap-2">
        {ALL_TOOLS.map((tool) => {
          const enabled = settings.allowedTools.includes(tool.id)
          return (
            <label
              key={tool.id}
              className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
              style={{
                background: enabled ? 'var(--accent-dim)' : 'var(--surface-secondary)',
                border: `1px solid ${enabled ? 'var(--accent)30' : 'var(--border)'}`,
              }}
            >
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => toggleTool(tool.id)}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)', flexShrink: 0 }}
              />
              <div>
                <p className="text-sm font-medium font-mono" style={{ color: 'var(--text)' }}>
                  {tool.label}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {tool.description}
                </p>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
