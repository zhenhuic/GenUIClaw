// Generative UI Schema — flat component map that the agent emits via the ui_render tool

export interface UISchema {
  version: '1.0'
  rootId: string
  components: Record<string, UIComponent>
  actions?: Record<string, UIAction>
}

// ---- Component union ----

export type UIComponent =
  | UIButtonComponent
  | UIFormComponent
  | UITableComponent
  | UICardComponent
  | UISelectComponent
  | UIFilePickerComponent
  | UIChartComponent
  | UITextComponent
  | UIProgressComponent
  | UIBadgeComponent
  | UIContainerComponent

export interface UIButtonComponent {
  type: 'button'
  id: string
  label: string
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost'
  disabled?: boolean
  actionId: string
  confirmMessage?: string
}

export interface UIFormField {
  name: string
  label: string
  type: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'date' | 'file'
  placeholder?: string
  defaultValue?: unknown
  required?: boolean
  options?: Array<{ value: string; label: string }>
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
    min?: number
    max?: number
  }
}

export interface UIFormComponent {
  type: 'form'
  id: string
  title?: string
  fields: UIFormField[]
  submitLabel?: string
  actionId: string
}

export interface UITableColumn {
  key: string
  header: string
  sortable?: boolean
}

export interface UITableComponent {
  type: 'table'
  id: string
  title?: string
  columns: UITableColumn[]
  rows: Array<Record<string, unknown>>
  selectable?: boolean
  onRowSelectActionId?: string
  pagination?: { pageSize: number }
}

export interface UICardComponent {
  type: 'card'
  id: string
  title?: string
  subtitle?: string
  body?: string
  childIds?: string[]
  actionId?: string
}

export interface UISelectComponent {
  type: 'select'
  id: string
  label: string
  options: Array<{ value: string; label: string }>
  defaultValue?: string
  multiple?: boolean
  actionId: string
}

export interface UIFilePickerComponent {
  type: 'file_picker'
  id: string
  label: string
  accept?: string
  multiple?: boolean
  actionId: string
}

export interface UIChartComponent {
  type: 'chart'
  id: string
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter'
  title?: string
  data: Array<Record<string, unknown>>
  xKey: string
  yKeys: string[]
  colors?: string[]
}

export interface UITextComponent {
  type: 'text'
  id: string
  content: string
  variant?: 'body' | 'heading' | 'caption' | 'code'
}

export interface UIProgressComponent {
  type: 'progress'
  id: string
  label?: string
  value: number
  status?: 'active' | 'success' | 'error'
}

export interface UIBadgeComponent {
  type: 'badge'
  id: string
  label: string
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
}

export interface UIContainerComponent {
  type: 'container'
  id: string
  direction?: 'row' | 'column'
  gap?: 'sm' | 'md' | 'lg'
  childIds: string[]
}

// ---- Actions ----

export interface UIAction {
  id: string
  type: 'callback'
  description?: string
  payload?: Record<string, unknown>
}

// ---- Props interface for all generative UI components ----

export interface UIComponentProps<T extends UIComponent = UIComponent> {
  component: T
  schema: UISchema
  renderComponent: (id: string) => React.ReactNode
  sessionId: string
  renderBlockId: string
}
