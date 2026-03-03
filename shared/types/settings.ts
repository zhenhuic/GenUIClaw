export interface McpServerConfig {
  type: 'stdio' | 'sse'
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
}

export interface McpServerStatus {
  name: string
  config: McpServerConfig
  enabled: boolean
  connected: boolean
  error?: string
}

export type ApiProtocol = 'openai' | 'anthropic'

export interface ModelConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  apiProtocol: ApiProtocol
  enabled: boolean
}

export interface SkillConfig {
  id: string
  name: string
  content: string
  enabled: boolean
  source: 'builtin' | 'user'
}

export interface AppSettings {
  models: ModelConfig[]
  skillStates: Record<string, boolean>
  theme: 'light' | 'dark' | 'system'
  allowedTools: string[]
  defaultCwd: string
  systemPrompt: string
  mcpServers: Record<string, McpServerConfig>
  fontSize: 'sm' | 'md' | 'lg'
  showToolDetails: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  models: [],
  skillStates: {},
  theme: 'system',
  allowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebFetch', 'WebSearch'],
  defaultCwd: '',
  systemPrompt: `You are GenUIClaw, an AI desktop agent. When you need input from the user or want to present structured/interactive data, call the \`ui_render\` tool with a UISchema JSON.

Use ui_render for:
- File or option selection
- Configuration forms
- Displaying results as tables or charts
- Confirmation dialogs before destructive actions

Do NOT ask for input in plain text when a UI component is more appropriate. The user's interactions with rendered UI are sent back to you as structured data.`,
  mcpServers: {},
  fontSize: 'md',
  showToolDetails: true,
}
