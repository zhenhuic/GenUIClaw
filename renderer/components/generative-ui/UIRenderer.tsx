import React from 'react'
import type { UISchema } from '../../../shared/types/ui-schema'
import { componentRegistry } from './registry'

interface Props {
  schema: UISchema
  sessionId: string
  renderBlockId: string
  onAction: (renderBlockId: string, actionId: string, data: Record<string, unknown>) => void
}

export function UIRenderer({ schema, sessionId, renderBlockId, onAction }: Props) {
  const renderComponent = (id: string): React.ReactNode => {
    const component = schema.components[id]
    if (!component) return null

    const Component = componentRegistry[component.type]
    if (!Component) {
      console.warn(`[UIRenderer] Unknown component type: ${component.type}`)
      return null
    }

    return (
      <Component
        key={id}
        component={component as never}
        schema={schema}
        renderComponent={renderComponent}
        sessionId={sessionId}
        renderBlockId={renderBlockId}
        onAction={onAction}
      />
    )
  }

  return (
    <div
      className="generative-ui-root rounded-2xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {renderComponent(schema.rootId)}
    </div>
  )
}
