import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/constants/ipc-channels'
import type {
  AgentStartPayload,
  AgentInterruptPayload,
  UIActionPayload,
  IpcAgentEvent,
  RemoteControlStatus,
} from '../shared/types/ipc'
import type { AppSettings, McpServerConfig } from '../shared/types/settings'

// Whitelist of channels allowed for renderer→main invoke calls
const ALLOWED_INVOKE_CHANNELS = new Set([
  IPC_CHANNELS.AGENT_START,
  IPC_CHANNELS.AGENT_INTERRUPT,
  IPC_CHANNELS.UI_ACTION,
  IPC_CHANNELS.CONVERSATION_LIST,
  IPC_CHANNELS.CONVERSATION_GET,
  IPC_CHANNELS.CONVERSATION_CREATE,
  IPC_CHANNELS.CONVERSATION_DELETE,
  IPC_CHANNELS.MESSAGES_GET,
  IPC_CHANNELS.MCP_LIST,
  IPC_CHANNELS.MCP_ADD,
  IPC_CHANNELS.MCP_REMOVE,
  IPC_CHANNELS.MCP_RECONNECT,
  IPC_CHANNELS.SETTINGS_GET,
  IPC_CHANNELS.SETTINGS_SET,
  IPC_CHANNELS.UI_WINDOW_ACTION,
  IPC_CHANNELS.UI_WINDOW_GET_SCHEMA,
  IPC_CHANNELS.SKILLS_LIST,
  IPC_CHANNELS.SKILLS_SAVE,
  IPC_CHANNELS.SKILLS_UPDATE,
  IPC_CHANNELS.SKILLS_DELETE,
  IPC_CHANNELS.SKILLS_TOGGLE,
  IPC_CHANNELS.SKILLS_IMPORT,
  IPC_CHANNELS.REMOTE_CONTROL_GET_STATUS,
  IPC_CHANNELS.REMOTE_CONTROL_REGEN_KEY,
])

function safeInvoke(channel: string, payload?: unknown): Promise<unknown> {
  if (!ALLOWED_INVOKE_CHANNELS.has(channel as (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS])) {
    throw new Error(`Unauthorized IPC channel: ${channel}`)
  }
  return ipcRenderer.invoke(channel, payload)
}

contextBridge.exposeInMainWorld('electronAPI', {
  agent: {
    start: (payload: AgentStartPayload) => safeInvoke(IPC_CHANNELS.AGENT_START, payload),

    interrupt: (payload: AgentInterruptPayload) =>
      safeInvoke(IPC_CHANNELS.AGENT_INTERRUPT, payload),

    uiAction: (payload: UIActionPayload) => safeInvoke(IPC_CHANNELS.UI_ACTION, payload),

    // Subscribe to streaming agent events from main process
    // Returns a cleanup function to remove the listener
    onStreamEvent: (callback: (event: IpcAgentEvent) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: IpcAgentEvent): void => {
        callback(data)
      }
      ipcRenderer.on(IPC_CHANNELS.AGENT_STREAM_EVENT, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.AGENT_STREAM_EVENT, handler)
    },
  },

  conversations: {
    list: () => safeInvoke(IPC_CHANNELS.CONVERSATION_LIST),
    get: (id: string) => safeInvoke(IPC_CHANNELS.CONVERSATION_GET, { id }),
    create: (title: string) => safeInvoke(IPC_CHANNELS.CONVERSATION_CREATE, { title }),
    delete: (id: string) => safeInvoke(IPC_CHANNELS.CONVERSATION_DELETE, { id }),
    getMessages: (conversationId: string) =>
      safeInvoke(IPC_CHANNELS.MESSAGES_GET, { conversationId }),
    onTitleUpdated: (callback: (data: { conversationId: string; title: string }) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: { conversationId: string; title: string }): void => {
        callback(data)
      }
      ipcRenderer.on(IPC_CHANNELS.CONVERSATION_TITLE_UPDATED, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.CONVERSATION_TITLE_UPDATED, handler)
    },
  },

  mcp: {
    list: () => safeInvoke(IPC_CHANNELS.MCP_LIST),
    add: (name: string, config: McpServerConfig) =>
      safeInvoke(IPC_CHANNELS.MCP_ADD, { name, config }),
    remove: (name: string) => safeInvoke(IPC_CHANNELS.MCP_REMOVE, { name }),
    reconnect: (name: string) => safeInvoke(IPC_CHANNELS.MCP_RECONNECT, { name }),
  },

  settings: {
    get: () => safeInvoke(IPC_CHANNELS.SETTINGS_GET),
    set: (partial: Partial<AppSettings>) => safeInvoke(IPC_CHANNELS.SETTINGS_SET, partial),
  },

  skills: {
    list: () => safeInvoke(IPC_CHANNELS.SKILLS_LIST),
    save: (payload: { name: string; content: string }) =>
      safeInvoke(IPC_CHANNELS.SKILLS_SAVE, payload),
    update: (payload: { id: string; name: string; content: string }) =>
      safeInvoke(IPC_CHANNELS.SKILLS_UPDATE, payload),
    delete: (id: string) => safeInvoke(IPC_CHANNELS.SKILLS_DELETE, { id }),
    toggle: (id: string) => safeInvoke(IPC_CHANNELS.SKILLS_TOGGLE, { id }),
    import: () => safeInvoke(IPC_CHANNELS.SKILLS_IMPORT),
  },

  uiWindow: {
    onSchema: (callback: (data: unknown) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: unknown): void => {
        callback(data)
      }
      ipcRenderer.on(IPC_CHANNELS.UI_WINDOW_SCHEMA, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.UI_WINDOW_SCHEMA, handler)
    },
    getSchema: () => safeInvoke(IPC_CHANNELS.UI_WINDOW_GET_SCHEMA),
    action: (payload: { sessionId: string; renderBlockId: string; actionId: string; data: Record<string, unknown> }) =>
      safeInvoke(IPC_CHANNELS.UI_WINDOW_ACTION, payload),
  },

  remoteControl: {
    getStatus: () => safeInvoke(IPC_CHANNELS.REMOTE_CONTROL_GET_STATUS),

    regenKey: () => safeInvoke(IPC_CHANNELS.REMOTE_CONTROL_REGEN_KEY),

    onStatusChange: (callback: (status: RemoteControlStatus) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, data: RemoteControlStatus): void => {
        callback(data)
      }
      ipcRenderer.on(IPC_CHANNELS.REMOTE_CONTROL_STATUS, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.REMOTE_CONTROL_STATUS, handler)
    },

    onActivateConversation: (
      callback: (data: { conversationId: string; userMessage: string; sessionId: string }) => void
    ): (() => void) => {
      const handler = (
        _e: Electron.IpcRendererEvent,
        data: { conversationId: string; userMessage: string; sessionId: string }
      ): void => {
        callback(data)
      }
      ipcRenderer.on(IPC_CHANNELS.REMOTE_ACTIVATE_CONVERSATION, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.REMOTE_ACTIVATE_CONVERSATION, handler)
    },
  },
})
