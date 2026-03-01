import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { UICardComponent } from '../../../../shared/types/ui-schema'
import type { UIComponentBaseProps } from '../registry'

type Props = UIComponentBaseProps & { component: UICardComponent }

export function UICard({ component, renderComponent, renderBlockId, onAction }: Props) {
  const isClickable = !!component.actionId

  return (
    <div
      className="rounded-2xl flex flex-col gap-3"
      style={{
        background: 'var(--surface-secondary)',
        border: '1px solid var(--border)',
        padding: '18px 20px',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onClick={() => isClickable && onAction(renderBlockId, component.actionId!, {})}
      onMouseEnter={(e) => {
        if (isClickable) {
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(124,106,247,0.15)'
        }
      }}
      onMouseLeave={(e) => {
        if (isClickable) {
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
        }
      }}
    >
      {(component.title || component.subtitle) && (
        <div>
          {component.title && (
            <p className="font-semibold" style={{ color: 'var(--text)', fontSize: 14 }}>
              {component.title}
            </p>
          )}
          {component.subtitle && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {component.subtitle}
            </p>
          )}
        </div>
      )}
      {component.body && (
        <div className="selectable prose text-sm" style={{ color: 'var(--text-secondary)' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{component.body}</ReactMarkdown>
        </div>
      )}
      {component.childIds?.map((id) => (
        <div key={id}>{renderComponent(id)}</div>
      ))}
    </div>
  )
}
