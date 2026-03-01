import React, { useState } from 'react'
import type { UISelectComponent } from '../../../../shared/types/ui-schema'
import type { UIComponentBaseProps } from '../registry'

type Props = UIComponentBaseProps & { component: UISelectComponent }

export function UISelect({ component, renderBlockId, onAction }: Props) {
  const [value, setValue] = useState<string>(component.defaultValue ?? '')
  const [sent, setSent] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    setValue(v)
    if (v) {
      onAction(renderBlockId, component.actionId, { value: v })
      setSent(true)
      setTimeout(() => setSent(false), 1500)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {component.label}
        {sent && (
          <span
            className="ml-2"
            style={{ color: 'var(--green)', fontWeight: 400 }}
          >
            Sent
          </span>
        )}
      </label>
      <select
        value={value}
        onChange={handleChange}
        multiple={component.multiple}
        className="selectable ui-input-focus"
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 14px',
          color: 'var(--text)',
          fontSize: 13,
          outline: 'none',
          width: '100%',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
      >
        <option value="">Select...</option>
        {component.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
