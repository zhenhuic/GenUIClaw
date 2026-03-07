import React, { useState } from 'react'
import { X, Server, Wrench, Palette, Cpu, Sparkles, Smartphone } from 'lucide-react'
import { MCPServerList } from './MCPServerList'
import { GeneralSettings } from './GeneralSettings'
import { ToolSettings } from './ToolSettings'
import { ModelsSettings } from './ModelsSettings'
import { SkillsSettings } from './SkillsSettings'
import { RemoteAccessSettings } from './RemoteAccessSettings'

interface Props {
  onClose: () => void
}

type Tab = 'general' | 'models' | 'skills' | 'tools' | 'mcp' | 'remote'

export function SettingsPanel({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('general')

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'general', label: 'General', icon: <Palette size={14} /> },
    { id: 'models', label: 'Models', icon: <Cpu size={14} /> },
    { id: 'skills', label: 'Skills', icon: <Sparkles size={14} /> },
    { id: 'tools', label: 'Tools', icon: <Wrench size={14} /> },
    { id: 'mcp', label: 'MCP Servers', icon: <Server size={14} /> },
    { id: 'remote', label: 'Remote Control', icon: <Smartphone size={14} /> },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: '#00000060' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex rounded-2xl overflow-hidden"
        style={{
          width: 720,
          height: 560,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}
      >
        {/* Sidebar */}
        <div
          className="flex flex-col py-4 flex-shrink-0"
          style={{ width: 160, background: 'var(--surface-secondary)', borderRight: '1px solid var(--border)' }}
        >
          <p className="px-4 pb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Settings
          </p>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
              style={{
                background: activeTab === tab.id ? 'var(--surface)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--text-secondary)',
                borderLeft: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div
            className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
              {tabs.find((t) => t.id === activeTab)?.label}
            </p>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'models' && <ModelsSettings />}
            {activeTab === 'skills' && <SkillsSettings />}
            {activeTab === 'tools' && <ToolSettings />}
            {activeTab === 'mcp' && <MCPServerList />}
            {activeTab === 'remote' && <RemoteAccessSettings />}
          </div>
        </div>
      </div>
    </div>
  )
}
