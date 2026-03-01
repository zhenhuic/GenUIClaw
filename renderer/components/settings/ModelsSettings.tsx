import React, { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { useSettingsStore } from '../../store/settings-store'
import type { ModelConfig, ApiProtocol } from '../../../shared/types/settings'

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

interface ModelFormState {
  name: string
  baseUrl: string
  apiKey: string
  apiProtocol: ApiProtocol
  enabled: boolean
}

const emptyForm: ModelFormState = {
  name: '',
  baseUrl: '',
  apiKey: '',
  apiProtocol: 'openai',
  enabled: true,
}

export function ModelsSettings() {
  const { settings, update } = useSettingsStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState<ModelFormState>(emptyForm)

  const models = settings.models || []

  const saveModels = (newModels: ModelConfig[]) => {
    update({ models: newModels })
  }

  const startAdd = () => {
    setForm(emptyForm)
    setIsAdding(true)
    setEditingId(null)
  }

  const startEdit = (model: ModelConfig) => {
    setForm({
      name: model.name,
      baseUrl: model.baseUrl,
      apiKey: model.apiKey,
      apiProtocol: model.apiProtocol,
      enabled: model.enabled,
    })
    setEditingId(model.id)
    setIsAdding(false)
  }

  const cancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const confirmAdd = () => {
    if (!form.name.trim() || !form.baseUrl.trim()) return
    const newModel: ModelConfig = {
      id: crypto.randomUUID(),
      ...form,
      name: form.name.trim(),
      baseUrl: form.baseUrl.trim(),
    }
    saveModels([...models, newModel])
    cancel()
  }

  const confirmEdit = () => {
    if (!editingId || !form.name.trim() || !form.baseUrl.trim()) return
    saveModels(
      models.map((m) =>
        m.id === editingId
          ? { ...m, ...form, name: form.name.trim(), baseUrl: form.baseUrl.trim() }
          : m
      )
    )
    cancel()
  }

  const deleteModel = (id: string) => {
    saveModels(models.filter((m) => m.id !== id))
  }

  const toggleEnabled = (id: string) => {
    saveModels(models.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)))
  }

  const isFormValid = form.name.trim() && form.baseUrl.trim()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Configure AI models. Each model needs a name, API endpoint, key, and protocol.
        </p>
        {!isAdding && !editingId && (
          <button
            onClick={startAdd}
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Plus size={12} />
            Add Model
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {(isAdding || editingId) && (
        <div
          className="flex flex-col gap-3 p-4 rounded-xl"
          style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {isAdding ? 'New Model' : 'Edit Model'}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Claude Sonnet"
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Protocol</label>
              <select
                value={form.apiProtocol}
                onChange={(e) => setForm({ ...form, apiProtocol: e.target.value as ApiProtocol })}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="openai">OpenAI Compatible</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Base URL</label>
            <input
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              style={inputStyle}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>API Key</label>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="sk-..."
              style={inputStyle}
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
              onClick={isAdding ? confirmAdd : confirmEdit}
              disabled={!isFormValid}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: isFormValid ? 'var(--accent)' : 'var(--surface)',
                color: isFormValid ? '#fff' : 'var(--text-muted)',
              }}
            >
              <Check size={12} />
              {isAdding ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Model list */}
      <div className="flex flex-col gap-2">
        {models.length === 0 && !isAdding && (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
            No models configured. Click "Add Model" to get started.
          </p>
        )}

        {models.map((model) => (
          <div
            key={model.id}
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{
              background: model.enabled ? 'var(--surface-secondary)' : 'var(--surface)',
              border: `1px solid ${model.enabled ? 'var(--border)' : 'var(--border)'}`,
              opacity: model.enabled ? 1 : 0.6,
            }}
          >
            <label className="flex-shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={model.enabled}
                onChange={() => toggleEnabled(model.id)}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
              />
            </label>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                {model.name}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {model.apiProtocol.toUpperCase()} · {model.baseUrl}
              </p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => startEdit(model)}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--text-muted)' }}
                title="Edit"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => deleteModel(model.id)}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--red)' }}
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
