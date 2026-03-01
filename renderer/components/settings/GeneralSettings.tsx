import React from 'react'
import { useSettingsStore } from '../../store/settings-store'
import type { AppSettings } from '../../../shared/types/settings'

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 12px',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

export function GeneralSettings() {
  const { settings, update } = useSettingsStore()

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    update({ [key]: value })
  }

  return (
    <div className="flex flex-col gap-6">
      <Field label="Theme" description="Application color theme">
        <select
          value={settings.theme}
          onChange={(e) => handleChange('theme', e.target.value as AppSettings['theme'])}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="system">System</option>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </Field>

      <Field label="Default Working Directory" description="Default directory for agent file operations">
        <input
          type="text"
          value={settings.defaultCwd}
          onChange={(e) => handleChange('defaultCwd', e.target.value)}
          placeholder="/Users/you/projects"
          style={inputStyle}
          className="selectable"
        />
      </Field>

      <Field label="System Prompt" description="Instructions given to the agent at the start of every session">
        <textarea
          value={settings.systemPrompt}
          onChange={(e) => handleChange('systemPrompt', e.target.value)}
          rows={6}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
          className="selectable"
        />
      </Field>

      <Field label="Show Tool Details" description="Show tool inputs/outputs in the chat">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.showToolDetails}
            onChange={(e) => handleChange('showToolDetails', e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Enabled
          </span>
        </label>
      </Field>
    </div>
  )
}

function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {label}
        </p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}
