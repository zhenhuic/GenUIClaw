import React from 'react'
import type { UIContainerComponent } from '../../../../shared/types/ui-schema'
import type { UIComponentBaseProps } from '../registry'

type Props = UIComponentBaseProps & { component: UIContainerComponent }

const gapMap = { sm: 8, md: 16, lg: 24 }

export function UIContainer({ component, renderComponent }: Props) {
  const gap = gapMap[component.gap ?? 'md']
  const isRow = component.direction === 'row'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: component.direction ?? 'column',
        gap,
        flexWrap: isRow ? 'wrap' : 'nowrap',
        alignItems: isRow ? 'flex-start' : 'stretch',
      }}
    >
      {component.childIds.map((id) => (
        <div key={id} style={{ minWidth: 0, flex: isRow ? '0 1 auto' : undefined }}>
          {renderComponent(id)}
        </div>
      ))}
    </div>
  )
}
