// ---- UI Schema (mirrored from desktop shared/types/ui-schema.ts) ----

export interface UISchema {
  version: '1.0'
  rootId: string
  components: Record<string, UIComponent>
  actions?: Record<string, UIAction>
}

export interface UIAction {
  type: string
  label?: string
}

export type UIComponent =
  | UIButton
  | UIForm
  | UITable
  | UICard
  | UISelect
  | UIChart
  | UIText
  | UIProgress
  | UIBadge
  | UIContainer
  | UIFilePicker

export interface UIButton {
  type: 'button'
  id: string
  label: string
  actionId?: string
  variant?: 'primary' | 'secondary' | 'danger'
}

export interface UIForm {
  type: 'form'
  id: string
  title?: string
  fields: UIFormField[]
  submitLabel?: string
  actionId?: string
}

export interface UIFormField {
  name: string
  label: string
  type: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox'
  placeholder?: string
  required?: boolean
  options?: Array<{ value: string; label: string }>
}

export interface UITable {
  type: 'table'
  id: string
  title?: string
  columns: Array<{ key: string; header: string }>
  rows: Array<Record<string, unknown>>
}

export interface UICard {
  type: 'card'
  id: string
  title?: string
  childIds?: string[]
}

export interface UISelect {
  type: 'select'
  id: string
  label?: string
  options: Array<{ value: string; label: string }>
  actionId?: string
  placeholder?: string
}

export interface UIChart {
  type: 'chart'
  id: string
  title?: string
  chartType: 'bar' | 'line' | 'pie'
  data: Array<Record<string, unknown>>
  dataKeys: string[]
  xKey?: string
}

export interface UIText {
  type: 'text'
  id: string
  content: string
  variant?: 'default' | 'heading' | 'subheading' | 'muted'
}

export interface UIProgress {
  type: 'progress'
  id: string
  value: number
  max?: number
  label?: string
}

export interface UIBadge {
  type: 'badge'
  id: string
  label: string
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export interface UIContainer {
  type: 'container'
  id: string
  direction?: 'row' | 'column'
  childIds?: string[]
}

export interface UIFilePicker {
  type: 'file_picker'
  id: string
  label?: string
  accept?: string
  actionId?: string
}

// ---- Agent event types ----

export type IpcAgentEvent =
  | { type: 'session_start'; sessionId: string }
  | { type: 'system_init'; sessionId: string; mcpServers: unknown[] }
  | { type: 'text_delta'; sessionId: string; text: string }
  | { type: 'tool_call_start'; sessionId: string; toolCallId: string; toolName: string; input: unknown }
  | { type: 'tool_call_result'; sessionId: string; toolCallId: string; output: unknown; isError: boolean }
  | { type: 'ui_render'; sessionId: string; schema: UISchema; renderBlockId: string }
  | { type: 'session_end'; sessionId: string; status: 'success' | 'interrupted' | 'error'; error?: string }
  | { type: 'ui_action_received'; sessionId: string; renderBlockId: string; actionId: string; data: Record<string, unknown> }

// ---- Message content blocks ----

export type MessageContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'tool_call'
      toolCallId: string
      toolName: string
      input: unknown
      status: 'pending' | 'done' | 'error'
      output?: unknown
      isError?: boolean
    }
  | { type: 'ui_render'; renderBlockId: string; schema: UISchema }

export interface AppMessage {
  id: string
  role: 'user' | 'assistant'
  content: MessageContentBlock[]
  sessionId?: string
  createdAt: number
}

export interface RemoteAgent {
  id: string
  name: string
  pairingKey: string
  createdAt: number
}

export interface RemoteConversation {
  id: string
  agentId: string
  title: string
  createdAt: number
  updatedAt: number
}
