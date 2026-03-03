import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square, ChevronDown, Sparkles, X } from 'lucide-react'
import { useAgentStore } from '../../store/agent-store'
import { useSettingsStore } from '../../store/settings-store'
import { useSkillsStore } from '../../store/skills-store'

interface Props {
  onSend: (text: string) => void
  onInterrupt: () => void
  isRunning: boolean
}

export function InputBar({ onSend, onInterrupt, isRunning }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false)
  const skillsDropdownRef = useRef<HTMLDivElement>(null)

  const { settings } = useSettingsStore()
  const {
    selectedModelId,
    selectedSkillIds,
    setSelectedModelId,
    toggleSkillId,
  } = useAgentStore()
  const { skills, loaded: skillsLoaded, load: loadSkills } = useSkillsStore()

  const enabledModels = settings.models.filter((m) => m.enabled)
  const enabledSkills = skills.filter((s) => s.enabled)

  useEffect(() => {
    if (!skillsLoaded) loadSkills()
  }, [skillsLoaded, loadSkills])

  // Auto-select first enabled model if none selected
  useEffect(() => {
    if (!selectedModelId && enabledModels.length > 0) {
      setSelectedModelId(enabledModels[0].id)
    }
  }, [selectedModelId, enabledModels, setSelectedModelId])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (skillsDropdownRef.current && !skillsDropdownRef.current.contains(e.target as Node)) {
        setShowSkillsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSend = useCallback(() => {
    const text = value.trim()
    if (!text || isRunning) return
    setValue('')
    onSend(text)
  }, [value, isRunning, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const selectedSkillNames = enabledSkills.filter((s) => selectedSkillIds.includes(s.id))

  return (
    <div
      className="flex flex-col gap-0 rounded-2xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Toolbar: Model selector + Skills */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-wrap rounded-t-2xl"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-secondary)' }}
      >
        {/* Model selector */}
        <div className="flex items-center gap-1.5">
          <select
            value={selectedModelId || ''}
            onChange={(e) => setSelectedModelId(e.target.value || null)}
            className="text-xs rounded-md px-2 py-1 outline-none cursor-pointer"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              maxWidth: 180,
            }}
          >
            {enabledModels.length === 0 && (
              <option value="">No models configured</option>
            )}
            {enabledModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

        {/* Selected skills chips */}
        {selectedSkillNames.map((skill) => (
          <span
            key={skill.id}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full cursor-pointer"
            style={{
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)30',
            }}
            onClick={() => toggleSkillId(skill.id)}
          >
            <Sparkles size={10} />
            {skill.name}
            <X size={10} />
          </span>
        ))}

        {/* Skills dropdown toggle */}
        {enabledSkills.length > 0 && (
          <div className="relative" ref={skillsDropdownRef}>
            <button
              onClick={() => setShowSkillsDropdown(!showSkillsDropdown)}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <Sparkles size={10} />
              Skills
              <ChevronDown size={10} />
            </button>

            {showSkillsDropdown && (
              <div
                className="absolute bottom-full left-0 mb-1 rounded-lg shadow-lg py-1 z-50"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  minWidth: 200,
                  maxHeight: 240,
                  overflowY: 'auto',
                }}
              >
                {enabledSkills.map((skill) => {
                  const active = selectedSkillIds.includes(skill.id)
                  return (
                    <button
                      key={skill.id}
                      onClick={() => toggleSkillId(skill.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                      style={{
                        background: active ? 'var(--accent-dim)' : 'transparent',
                        color: active ? 'var(--accent)' : 'var(--text)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        readOnly
                        style={{ width: 14, height: 14, accentColor: 'var(--accent)', flexShrink: 0 }}
                      />
                      <span className="truncate">{skill.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Text input + send/stop */}
      <div className="flex items-end gap-2 p-3 rounded-b-2xl">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRunning ? 'Agent is working...' : 'Message GenUIClaw... (Enter to send, Shift+Enter for newline)'}
          disabled={isRunning}
          rows={1}
          className="flex-1 resize-none outline-none text-sm bg-transparent selectable"
          style={{
            color: 'var(--text)',
            lineHeight: 1.6,
            minHeight: 24,
            fontFamily: 'inherit',
          }}
        />

        {isRunning ? (
          <button
            onClick={onInterrupt}
            className="flex-shrink-0 p-2 rounded-lg transition-colors"
            style={{ background: 'var(--red)', color: '#fff' }}
            title="Stop"
          >
            <Square size={14} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className="flex-shrink-0 p-2 rounded-lg transition-colors"
            style={{
              background: value.trim() ? 'var(--accent)' : 'var(--surface-secondary)',
              color: value.trim() ? '#fff' : 'var(--text-muted)',
              cursor: value.trim() ? 'pointer' : 'default',
            }}
            title="Send"
          >
            <Send size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
