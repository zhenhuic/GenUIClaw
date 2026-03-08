import type { UISchema } from './ui-schema'
import type { AppSettings, McpServerConfig, McpServerStatus, SkillConfig } from './settings'
import type { AppMessage, Conversation } from './conversation'

// ---- Renderer → Main (invoke payloads) ----

export interface AgentStartPayload {
  sessionId: string
  prompt: string
  conversationId: string
  allowedTools: string[]
  mcpServers: Record<string, McpServerConfig>
  cwd?: string
  systemPrompt?: string
  modelId?: string
  skillIds?: string[]
}

export interface AgentInterruptPayload {
  sessionId: string
}

export interface UIActionPayload {
  sessionId: string
  conversationId: string
  renderBlockId: string
  actionId: string
  data: Record<string, unknown>
  agentContext: {
    allowedTools: string[]
    mcpServers: Record<string, McpServerConfig>
    cwd?: string
    systemPrompt?: string
    modelId?: string
    skillIds?: string[]
  }
}

export interface ConversationGetPayload {
  id: string
}

export interface ConversationDeletePayload {
  id: string
}

export interface ConversationCreatePayload {
  title: string
}

export interface MessagesGetPayload {
  conversationId: string
}

export interface McpAddPayload {
  name: string
  config: McpServerConfig
}

export interface McpRemovePayload {
  name: string
}

export interface McpReconnectPayload {
  name: string
}

// ---- Main → Renderer (push events via agent:stream-event) ----

export type IpcAgentEvent =
  | { type: 'session_start'; sessionId: string }
  | { type: 'system_init'; sessionId: string; mcpServers: McpServerStatus[] }
  | { type: 'text_delta'; sessionId: string; text: string }
  | {
      type: 'tool_call_start'
      sessionId: string
      toolCallId: string
      toolName: string
      input: unknown
    }
  | {
      type: 'tool_call_result'
      sessionId: string
      toolCallId: string
      output: unknown
      isError: boolean
    }
  | { type: 'ui_render'; sessionId: string; schema: UISchema; renderBlockId: string }
  | {
      type: 'session_end'
      sessionId: string
      status: 'success' | 'interrupted' | 'error'
      error?: string
    }
  | {
      type: 'ui_action_received'
      sessionId: string
      renderBlockId: string
      actionId: string
      data: Record<string, unknown>
    }

// ---- Remote control status ----

export interface RemoteStatus {
  relayConnected: boolean
  deviceCode: string
  mobileConnected: boolean
  relayUrl: string
}

// ---- Typed IPC return shapes ----

export type IpcResult<T> = { data: T; error?: never } | { data?: never; error: string }

// ---- Window API surface (exposed via contextBridge) ----

export interface ElectronAPI {
  agent: {
    start: (payload: AgentStartPayload) => Promise<IpcResult<{ sessionId: string; status: string }>>
    interrupt: (payload: AgentInterruptPayload) => Promise<IpcResult<{ status: string }>>
    uiAction: (payload: UIActionPayload) => Promise<IpcResult<{ status: string }>>
    onStreamEvent: (callback: (event: IpcAgentEvent) => void) => () => void
  }
  conversations: {
    list: () => Promise<IpcResult<Conversation[]>>
    get: (id: string) => Promise<IpcResult<Conversation>>
    create: (title: string) => Promise<IpcResult<Conversation>>
    delete: (id: string) => Promise<IpcResult<void>>
    getMessages: (conversationId: string) => Promise<IpcResult<AppMessage[]>>
    onTitleUpdated: (callback: (data: { conversationId: string; title: string }) => void) => () => void
    onChanged: (callback: () => void) => () => void
  }
  mcp: {
    list: () => Promise<IpcResult<McpServerStatus[]>>
    add: (name: string, config: McpServerConfig) => Promise<IpcResult<void>>
    remove: (name: string) => Promise<IpcResult<void>>
    reconnect: (name: string) => Promise<IpcResult<void>>
  }
  settings: {
    get: () => Promise<IpcResult<AppSettings>>
    set: (settings: Partial<AppSettings>) => Promise<IpcResult<void>>
  }
  skills: {
    list: () => Promise<IpcResult<SkillConfig[]>>
    save: (payload: { name: string; content: string }) => Promise<IpcResult<SkillConfig>>
    update: (payload: { id: string; name: string; content: string }) => Promise<IpcResult<SkillConfig>>
    delete: (id: string) => Promise<IpcResult<void>>
    toggle: (id: string) => Promise<IpcResult<{ enabled: boolean }>>
    import: () => Promise<IpcResult<SkillConfig[]>>
  }
  uiWindow: {
    onSchema: (callback: (data: { sessionId: string; renderBlockId: string; schema: UISchema }) => void) => () => void
    getSchema: () => Promise<IpcResult<{ sessionId: string; renderBlockId: string; schema: UISchema } | null>>
    action: (payload: { sessionId: string; renderBlockId: string; actionId: string; data: Record<string, unknown> }) => Promise<IpcResult<{ status: string }>>
  }
  remote: {
    start: (relayUrl: string) => Promise<IpcResult<{ deviceCode: string }>>
    stop: () => Promise<IpcResult<void>>
    status: () => Promise<IpcResult<RemoteStatus>>
    test: (relayUrl: string) => Promise<IpcResult<{ latencyMs: number }>>
    regenerate: () => Promise<IpcResult<{ deviceCode: string }>>
    onStatusPush: (callback: (status: RemoteStatus) => void) => () => void
  }
}

// Extend global window type
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
