import { registerAgentHandlers } from './agent-handlers'
import { registerConversationHandlers } from './conversation-handlers'
import { registerMcpHandlers } from './mcp-handlers'
import { registerSettingsHandlers } from './settings-handlers'
import { registerSkillsHandlers } from './skills-handlers'
import { registerRemoteControlHandlers } from './remote-control-handlers'
import log from 'electron-log'

export function registerAllHandlers(): void {
  registerAgentHandlers()
  registerConversationHandlers()
  registerMcpHandlers()
  registerSettingsHandlers()
  registerSkillsHandlers()
  registerRemoteControlHandlers()
  log.info('[IPC] All handlers registered')
}
