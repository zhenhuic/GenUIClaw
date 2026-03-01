import React, { useState, useEffect } from 'react'
import { Upload, Trash2, Pencil, Check, X, ChevronDown, ChevronRight, Loader2, Package, User } from 'lucide-react'
import { useSkillsStore } from '../../store/skills-store'
import type { SkillConfig } from '../../../shared/types/settings'

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

interface SkillFormState {
  name: string
  content: string
}

const emptyForm: SkillFormState = {
  name: '',
  content: '',
}

export function SkillsSettings() {
  const { skills, loaded, load, toggle, update, remove, importFromZip } = useSkillsStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SkillFormState>(emptyForm)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!loaded) load()
  }, [loaded, load])

  const builtinSkills = skills.filter((s) => s.source === 'builtin')
  const userSkills = skills.filter((s) => s.source === 'user')

  const handleImport = async () => {
    setImporting(true)
    try {
      await importFromZip()
    } finally {
      setImporting(false)
    }
  }

  const startEdit = (skill: SkillConfig) => {
    setForm({ name: skill.name, content: skill.content })
    setEditingId(skill.id)
  }

  const cancel = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const confirmEdit = async () => {
    if (!editingId || !form.name.trim() || !form.content.trim()) return
    await update(editingId, form.name.trim(), form.content.trim())
    cancel()
  }

  const handleDelete = async (id: string) => {
    await remove(id)
  }

  const handleToggle = async (id: string) => {
    await toggle(id)
  }

  const isFormValid = form.name.trim() && form.content.trim()

  const renderSkillItem = (skill: SkillConfig) => {
    const isExpanded = expandedId === skill.id
    const isBuiltin = skill.source === 'builtin'

    return (
      <div
        key={skill.id}
        className="flex flex-col rounded-lg overflow-hidden"
        style={{
          background: skill.enabled ? 'var(--surface-secondary)' : 'var(--surface)',
          border: '1px solid var(--border)',
          opacity: skill.enabled ? 1 : 0.6,
        }}
      >
        <div className="flex items-center gap-3 p-3">
          <label className="flex-shrink-0 cursor-pointer">
            <input
              type="checkbox"
              checked={skill.enabled}
              onChange={() => handleToggle(skill.id)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
            />
          </label>

          <button
            className="flex items-center gap-1 flex-1 min-w-0 text-left"
            onClick={() => setExpandedId(isExpanded ? null : skill.id)}
          >
            {isExpanded ? (
              <ChevronDown size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            ) : (
              <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            )}
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
              {skill.name}
            </p>
          </button>

          <div className="flex items-center gap-1 flex-shrink-0">
            {!isBuiltin && (
              <>
                <button
                  onClick={() => startEdit(skill)}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title="Edit"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(skill.id)}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--red)' }}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        </div>

        {isExpanded && (
          <div
            className="px-4 pb-3 text-xs"
            style={{
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              maxHeight: 200,
              overflowY: 'auto',
              borderTop: '1px solid var(--border)',
              paddingTop: 12,
            }}
          >
            {skill.content}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Manage built-in and imported skill prompts.
        </p>
        {!editingId && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{
              background: importing ? 'var(--surface-secondary)' : 'var(--accent)',
              color: importing ? 'var(--text-muted)' : '#fff',
            }}
          >
            {importing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            Import Skill
          </button>
        )}
      </div>

      {/* Edit form */}
      {editingId && (
        <div
          className="flex flex-col gap-3 p-4 rounded-xl"
          style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Edit Skill
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Code Review, Writing Assistant"
              style={inputStyle}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Content
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Skill instructions..."
              rows={8}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
            />
          </div>

          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              onClick={cancel}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)', background: 'var(--surface)' }}
            >
              <X size={12} />
              Cancel
            </button>
            <button
              onClick={confirmEdit}
              disabled={!isFormValid}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: isFormValid ? 'var(--accent)' : 'var(--surface)',
                color: isFormValid ? '#fff' : 'var(--text-muted)',
              }}
            >
              <Check size={12} />
              Save
            </button>
          </div>
        </div>
      )}

      {/* Built-in skills section */}
      {builtinSkills.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Package size={12} style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Built-in Skills
            </p>
          </div>
          {builtinSkills.map(renderSkillItem)}
        </div>
      )}

      {/* User skills section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <User size={12} style={{ color: 'var(--text-muted)' }} />
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            User Skills
          </p>
        </div>
        {userSkills.length === 0 && !editingId && (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
            No user skills. Click "Import Skill" to upload a .zip package.
          </p>
        )}
        {userSkills.map(renderSkillItem)}
      </div>
    </div>
  )
}
