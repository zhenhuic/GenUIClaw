export const IPC_CHANNELS = {
  // Agent lifecycle
  AGENT_START: 'agent:start',
  AGENT_INTERRUPT: 'agent:interrupt',
  AGENT_STREAM_EVENT: 'agent:stream-event', // main → renderer push

  // Conversations
  CONVERSATION_LIST: 'conversation:list',
  CONVERSATION_GET: 'conversation:get',
  CONVERSATION_CREATE: 'conversation:create',
  CONVERSATION_DELETE: 'conversation:delete',
  CONVERSATION_TITLE_UPDATED: 'conversation:title-updated',
  CONVERSATION_CHANGED: 'conversation:changed', // main → renderer: remote created/deleted

  // Messages
  MESSAGES_GET: 'messages:get',
  MESSAGE_SAVE: 'message:save',

  // MCP servers
  MCP_LIST: 'mcp:list',
  MCP_ADD: 'mcp:add',
  MCP_REMOVE: 'mcp:remove',
  MCP_RECONNECT: 'mcp:reconnect',
  MCP_STATUS: 'mcp:status',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Skills
  SKILLS_LIST: 'skills:list',
  SKILLS_SAVE: 'skills:save',
  SKILLS_UPDATE: 'skills:update',
  SKILLS_DELETE: 'skills:delete',
  SKILLS_TOGGLE: 'skills:toggle',
  SKILLS_IMPORT: 'skills:import',

  // Remote control
  REMOTE_START: 'remote:start',
  REMOTE_STOP: 'remote:stop',
  REMOTE_STATUS: 'remote:status',
  REMOTE_TEST: 'remote:test',
  REMOTE_REGENERATE: 'remote:regenerate',
  REMOTE_STATUS_PUSH: 'remote:status-push', // main → renderer push

  // Generative UI action callbacks
  UI_ACTION: 'ui:action',

  // UI Window
  UI_WINDOW_SCHEMA: 'ui-window:schema',
  UI_WINDOW_ACTION: 'ui-window:action',
  UI_WINDOW_GET_SCHEMA: 'ui-window:get-schema',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
