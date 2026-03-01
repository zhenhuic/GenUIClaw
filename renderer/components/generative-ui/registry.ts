import type { UIComponent } from '../../../shared/types/ui-schema'
import { UIButton } from './components/UIButton'
import { UIForm } from './components/UIForm'
import { UITable } from './components/UITable'
import { UICard } from './components/UICard'
import { UISelect } from './components/UISelect'
import { UIFilePicker } from './components/UIFilePicker'
import { UIChart } from './components/UIChart'
import { UIText } from './components/UIText'
import { UIProgress } from './components/UIProgress'
import { UIBadge } from './components/UIBadge'
import { UIContainer } from './components/UIContainer'
import type React from 'react'
import type { UISchema } from '../../../shared/types/ui-schema'

export interface UIComponentBaseProps {
  component: UIComponent
  schema: UISchema
  renderComponent: (id: string) => React.ReactNode
  sessionId: string
  renderBlockId: string
  onAction: (renderBlockId: string, actionId: string, data: Record<string, unknown>) => void
}

export const componentRegistry: Record<UIComponent['type'], React.ComponentType<UIComponentBaseProps>> = {
  button: UIButton as React.ComponentType<UIComponentBaseProps>,
  form: UIForm as React.ComponentType<UIComponentBaseProps>,
  table: UITable as React.ComponentType<UIComponentBaseProps>,
  card: UICard as React.ComponentType<UIComponentBaseProps>,
  select: UISelect as React.ComponentType<UIComponentBaseProps>,
  file_picker: UIFilePicker as React.ComponentType<UIComponentBaseProps>,
  chart: UIChart as React.ComponentType<UIComponentBaseProps>,
  text: UIText as React.ComponentType<UIComponentBaseProps>,
  progress: UIProgress as React.ComponentType<UIComponentBaseProps>,
  badge: UIBadge as React.ComponentType<UIComponentBaseProps>,
  container: UIContainer as React.ComponentType<UIComponentBaseProps>,
}
