import React from 'react'
import type { UIBadgeComponent } from '../../../../shared/types/ui-schema'
import type { UIComponentBaseProps } from '../registry'

type Props = UIComponentBaseProps & { component: UIBadgeComponent }

const colorMap = {
  green: { bg: '#4ade8020', text: '#4ade80', border: '#4ade8040' },
  yellow: { bg: '#fbbf2420', text: '#fbbf24', border: '#fbbf2440' },
  red: { bg: '#f8717120', text: '#f87171', border: '#f8717140' },
  blue: { bg: '#60a5fa20', text: '#60a5fa', border: '#60a5fa40' },
  gray: { bg: 'var(--surface-secondary)', text: 'var(--text-secondary)', border: 'var(--border)' },
}

export function UIBadge({ component }: Props) {
  const style = colorMap[component.color ?? 'gray']

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {component.label}
    </span>
  )
}
