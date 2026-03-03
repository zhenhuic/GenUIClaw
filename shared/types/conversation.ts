import type { UISchema } from './ui-schema'

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  isRemote?: boolean
}

// A single content block within a message
export type MessageContentBlock =
  | TextBlock
  | ToolCallBlock
  | ToolResultBlock
  | UIRenderBlock

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolCallBlock {
  type: 'tool_call'
  toolCallId: string
  toolName: string
  input: unknown
  status: 'pending' | 'done' | 'error'
  output?: unknown
  isError?: boolean
}

export interface ToolResultBlock {
  type: 'tool_result'
  toolCallId: string
  output: unknown
  isError: boolean
}

export interface UIRenderBlock {
  type: 'ui_render'
  renderBlockId: string
  schema: UISchema
}

export interface AppMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: MessageContentBlock[]
  sessionId?: string
  createdAt: number
}
