import React, { useState } from 'react'
import type { UISchema, UIComponent } from '../../types'

interface UIRendererProps {
  schema: UISchema
  renderBlockId: string
  onAction: (actionId: string, data: Record<string, unknown>) => void
}

export function UIRenderer({ schema, renderBlockId, onAction }: UIRendererProps) {
  const renderComponent = (id: string): React.ReactNode => {
    const component = schema.components[id]
    if (!component) return null
    return <ComponentRenderer key={id} component={component} schema={schema} renderComponent={renderComponent} onAction={onAction} renderBlockId={renderBlockId} />
  }

  return <div style={{ width: '100%' }}>{renderComponent(schema.rootId)}</div>
}

interface ComponentRendererProps {
  component: UIComponent
  schema: UISchema
  renderComponent: (id: string) => React.ReactNode
  onAction: (actionId: string, data: Record<string, unknown>) => void
  renderBlockId: string
}

function ComponentRenderer({ component, schema, renderComponent, onAction, renderBlockId }: ComponentRendererProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({})

  const cellStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: '1px solid var(--border, #e5e7eb)',
    fontSize: 13,
    textAlign: 'left',
  }

  switch (component.type) {
    case 'text':
      return (
        <p style={{
          fontSize: component.variant === 'heading' ? 18 : component.variant === 'subheading' ? 15 : 13,
          fontWeight: component.variant === 'heading' ? 700 : component.variant === 'subheading' ? 600 : 400,
          color: component.variant === 'muted' ? '#6b7280' : 'inherit',
          margin: '4px 0',
        }}>
          {component.content}
        </p>
      )

    case 'button':
      return (
        <button
          onClick={() => component.actionId && onAction(component.actionId, {})}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            background: component.variant === 'danger' ? '#ef4444' : component.variant === 'secondary' ? '#f3f4f6' : '#3b82f6',
            color: component.variant === 'secondary' ? '#374151' : '#fff',
            margin: '4px 0',
          }}
        >
          {component.label}
        </button>
      )

    case 'badge':
      return (
        <span style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 500,
          background: component.variant === 'success' ? '#d1fae5' : component.variant === 'warning' ? '#fef3c7' : component.variant === 'error' ? '#fee2e2' : '#e5e7eb',
          color: component.variant === 'success' ? '#065f46' : component.variant === 'warning' ? '#92400e' : component.variant === 'error' ? '#991b1b' : '#374151',
        }}>
          {component.label}
        </span>
      )

    case 'progress':
      return (
        <div style={{ margin: '8px 0' }}>
          {component.label && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px 0' }}>{component.label}</p>}
          <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, overflow: 'hidden' }}>
            <div style={{ background: '#3b82f6', height: '100%', width: `${Math.min(100, (component.value / (component.max ?? 100)) * 100)}%`, borderRadius: 4 }} />
          </div>
        </div>
      )

    case 'table':
      return (
        <div style={{ overflowX: 'auto', margin: '8px 0' }}>
          {component.title && <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px 0' }}>{component.title}</p>}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {component.columns.map((col) => (
                  <th key={col.key} style={{ ...cellStyle, fontWeight: 600, color: '#374151' }}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {component.rows.map((row, i) => (
                <tr key={i}>
                  {component.columns.map((col) => (
                    <td key={col.key} style={cellStyle}>{String(row[col.key] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'form':
      return (
        <div style={{ margin: '8px 0' }}>
          {component.title && <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>{component.title}</p>}
          {component.fields.map((field) => (
            <div key={field.name} style={{ margin: '8px 0' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                {field.label}{field.required && ' *'}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  rows={3}
                  placeholder={field.placeholder}
                  value={String(formData[field.name] ?? '')}
                  onChange={(e) => setFormData((d) => ({ ...d, [field.name]: e.target.value }))}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical' }}
                />
              ) : field.type === 'select' ? (
                <select
                  value={String(formData[field.name] ?? '')}
                  onChange={(e) => setFormData((d) => ({ ...d, [field.name]: e.target.value }))}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
                >
                  <option value="">{field.placeholder || 'Select...'}</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={Boolean(formData[field.name])}
                  onChange={(e) => setFormData((d) => ({ ...d, [field.name]: e.target.checked }))}
                />
              ) : (
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={String(formData[field.name] ?? '')}
                  onChange={(e) => setFormData((d) => ({ ...d, [field.name]: e.target.value }))}
                  style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
                />
              )}
            </div>
          ))}
          {component.actionId && (
            <button
              onClick={() => onAction(component.actionId!, formData)}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: '#3b82f6', color: '#fff', marginTop: 8 }}
            >
              {component.submitLabel || 'Submit'}
            </button>
          )}
        </div>
      )

    case 'select':
      return (
        <div style={{ margin: '8px 0' }}>
          {component.label && <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>{component.label}</label>}
          <select
            onChange={(e) => component.actionId && onAction(component.actionId, { value: e.target.value })}
            style={{ padding: '8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
          >
            <option value="">{component.placeholder || 'Select...'}</option>
            {component.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )

    case 'card':
      return (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, margin: '8px 0', background: '#fff' }}>
          {component.title && <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>{component.title}</p>}
          {component.childIds?.map((id) => renderComponent(id))}
        </div>
      )

    case 'container':
      return (
        <div style={{ display: 'flex', flexDirection: component.direction === 'row' ? 'row' : 'column', gap: 8, flexWrap: 'wrap' }}>
          {component.childIds?.map((id) => renderComponent(id))}
        </div>
      )

    default:
      return null
  }
}
