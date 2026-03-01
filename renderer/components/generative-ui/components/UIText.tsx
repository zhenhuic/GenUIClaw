import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { UITextComponent } from '../../../../shared/types/ui-schema'
import type { UIComponentBaseProps } from '../registry'

type Props = UIComponentBaseProps & { component: UITextComponent }

export function UIText({ component }: Props) {
  if (component.variant === 'code') {
    return (
      <pre
        className="selectable"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 12,
          lineHeight: 1.6,
          color: 'var(--text)',
          fontFamily: 'monospace',
          overflowX: 'auto',
        }}
      >
        {component.content}
      </pre>
    )
  }

  if (component.variant === 'heading') {
    return (
      <h3 className="font-semibold" style={{ color: 'var(--text)', fontSize: 15 }}>
        {component.content}
      </h3>
    )
  }

  if (component.variant === 'caption') {
    return (
      <p className="text-xs selectable" style={{ color: 'var(--text-muted)' }}>
        {component.content}
      </p>
    )
  }

  // Default: markdown body
  return (
    <div className="selectable prose text-sm" style={{ color: 'var(--text)' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{component.content}</ReactMarkdown>
    </div>
  )
}
