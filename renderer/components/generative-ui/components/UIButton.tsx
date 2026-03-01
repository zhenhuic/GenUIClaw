import React, { useState } from 'react'
import type { UIButtonComponent } from '../../../../shared/types/ui-schema'
import type { UIComponentBaseProps } from '../registry'

type Props = UIComponentBaseProps & { component: UIButtonComponent }

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: 'var(--accent)',
    color: '#fff',
    border: '1px solid transparent',
    boxShadow: '0 1px 3px rgba(124,106,247,0.3)',
  },
  secondary: {
    background: 'var(--surface-secondary)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  },
  destructive: {
    background: 'var(--red)',
    color: '#fff',
    border: '1px solid transparent',
    boxShadow: '0 1px 3px rgba(248,113,113,0.3)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
  },
}

export function UIButton({ component, renderBlockId, onAction }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const style = variantStyles[component.variant ?? 'primary']

  const handleClick = () => {
    if (component.confirmMessage && !confirming) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    setLoading(true)
    onAction(renderBlockId, component.actionId, {})
    setTimeout(() => setLoading(false), 1500)
  }

  if (confirming) {
    return (
      <div
        className="flex flex-col gap-3 p-4 rounded-xl"
        style={{
          background: 'var(--surface-secondary)',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--text)' }}>
          {component.confirmMessage}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleClick}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={variantStyles.destructive}
          >
            Confirm
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={variantStyles.secondary}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={component.disabled || loading}
      className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
      style={{
        ...style,
        opacity: component.disabled ? 0.5 : 1,
        cursor: component.disabled ? 'not-allowed' : 'pointer',
        transform: loading ? 'scale(0.97)' : 'scale(1)',
      }}
    >
      {loading ? 'Processing...' : component.label}
    </button>
  )
}
