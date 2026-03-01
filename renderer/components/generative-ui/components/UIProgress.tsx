import React from 'react'
import type { UIProgressComponent } from '../../../../shared/types/ui-schema'
import type { UIComponentBaseProps } from '../registry'

type Props = UIComponentBaseProps & { component: UIProgressComponent }

const statusColors = {
  active: 'var(--accent)',
  success: 'var(--green)',
  error: 'var(--red)',
}

export function UIProgress({ component }: Props) {
  const color = statusColors[component.status ?? 'active']
  const pct = Math.max(0, Math.min(100, component.value))

  return (
    <div className="flex flex-col gap-2">
      {component.label && (
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 500 }}>{component.label}</span>
          <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {pct}%
          </span>
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 8, background: 'var(--surface-secondary)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
    </div>
  )
}
