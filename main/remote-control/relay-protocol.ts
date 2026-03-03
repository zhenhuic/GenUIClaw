import type { IpcAgentEvent } from '../../shared/types/ipc'

// ---- Desktop → Relay messages ----

export interface AgentModelInfo {
  id: string
  name: string
}

export interface AgentSkillInfo {
  id: string
  name: string
}

export interface RegisterMessage {
  type: 'register'
  pairingKey: string
  clientVersion: string
  models?: AgentModelInfo[]
  skills?: AgentSkillInfo[]
}

export interface AgentEventMessage {
  type: 'agent_event'
  remoteSessionId: string
  event: IpcAgentEvent
}

export interface PongMessage {
  type: 'pong'
  ts: number
}

export interface TitleUpdateMessage {
  type: 'title_update'
  conversationId: string
  title: string
}

export interface DesktopErrorMessage {
  type: 'error'
  code: string
  message: string
}

// ---- Relay → Desktop messages ----

export interface RegisteredMessage {
  type: 'registered'
  pairingKey: string
}

export interface AgentStartMessage {
  type: 'agent_start'
  remoteSessionId: string
  conversationId: string
  text: string
  modelId?: string
  skillIds?: string[]
}

export interface AgentInterruptMessage {
  type: 'agent_interrupt'
  remoteSessionId: string
}

export interface UIActionMessage {
  type: 'ui_action'
  remoteSessionId: string
  renderBlockId: string
  actionId: string
  data: Record<string, unknown>
}

export interface PingMessage {
  type: 'ping'
  ts: number
}

// ---- Union types ----

export type DesktopToRelayMessage = RegisterMessage | AgentEventMessage | PongMessage | TitleUpdateMessage | DesktopErrorMessage

export type RelayToDesktopMessage =
  | RegisteredMessage
  | AgentStartMessage
  | AgentInterruptMessage
  | UIActionMessage
  | PingMessage

// ---- Helpers ----

export function isRelayMessage(raw: unknown): raw is RelayToDesktopMessage {
  return typeof raw === 'object' && raw !== null && 'type' in raw
}

export function serializeToRelay(msg: DesktopToRelayMessage): string {
  return JSON.stringify(msg)
}

export function deserializeFromRelay(raw: string): RelayToDesktopMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isRelayMessage(parsed)) return parsed
    return null
  } catch {
    return null
  }
}
