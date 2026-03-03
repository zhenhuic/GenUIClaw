import WebSocket from 'ws'
import { randomUUID } from 'crypto'

// ---- Session tracking ----

export interface AssistantBlock {
  type: string
  [key: string]: unknown
}

interface RemoteSession {
  remoteSessionId: string
  desktopSocket: WebSocket
  webSocket: WebSocket
  agentId: string
  userId: string
  conversationId: string
  pendingAssistantBlocks: AssistantBlock[]
}

// Maps: pairingKey → desktop socket
const desktopSockets = new Map<string, WebSocket>()
// Maps: remoteSessionId → session
const activeSessions = new Map<string, RemoteSession>()

// ---- Desktop socket registration ----

export function registerDesktop(pairingKey: string, socket: WebSocket): void {
  desktopSockets.set(pairingKey, socket)
}

export function unregisterDesktop(pairingKey: string): void {
  const socket = desktopSockets.get(pairingKey)
  desktopSockets.delete(pairingKey)
  // Clean up sessions for this desktop
  if (socket) {
    for (const [sessionId, session] of activeSessions) {
      if (session.desktopSocket === socket) {
        activeSessions.delete(sessionId)
      }
    }
  }
}

export function getDesktopSocket(pairingKey: string): WebSocket | undefined {
  return desktopSockets.get(pairingKey)
}

// ---- Session management ----

export function createSession(
  agentId: string,
  userId: string,
  conversationId: string,
  desktopSocket: WebSocket,
  webSocket: WebSocket
): string {
  const remoteSessionId = randomUUID()
  activeSessions.set(remoteSessionId, {
    remoteSessionId,
    desktopSocket,
    webSocket,
    agentId,
    userId,
    conversationId,
    pendingAssistantBlocks: [],
  })
  return remoteSessionId
}

export function getSession(remoteSessionId: string): RemoteSession | undefined {
  return activeSessions.get(remoteSessionId)
}

export function removeSessionsForWebSocket(webSocket: WebSocket): void {
  for (const [sessionId, session] of activeSessions) {
    if (session.webSocket === webSocket) {
      activeSessions.delete(sessionId)
    }
  }
}

// ---- Message forwarding ----

export function forwardToDesktop(remoteSessionId: string, msg: unknown): boolean {
  const session = activeSessions.get(remoteSessionId)
  if (!session || session.desktopSocket.readyState !== WebSocket.OPEN) return false
  session.desktopSocket.send(JSON.stringify(msg))
  return true
}

export function forwardToWeb(remoteSessionId: string, msg: unknown): boolean {
  const session = activeSessions.get(remoteSessionId)
  if (!session || session.webSocket.readyState !== WebSocket.OPEN) return false
  session.webSocket.send(JSON.stringify(msg))
  return true
}

// ---- Assistant message accumulation ----

export function accumulateAssistantEvent(
  remoteSessionId: string,
  event: Record<string, unknown>
): void {
  const session = activeSessions.get(remoteSessionId)
  if (!session) return

  const blocks = session.pendingAssistantBlocks

  switch (event.type) {
    case 'text_delta': {
      const lastBlock = blocks[blocks.length - 1]
      if (lastBlock?.type === 'text') {
        lastBlock.text = ((lastBlock.text as string) ?? '') + (event.text as string)
      } else {
        blocks.push({ type: 'text', text: event.text as string })
      }
      break
    }
    case 'tool_call_start': {
      blocks.push({
        type: 'tool_call',
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        input: event.input,
        status: 'pending',
      })
      break
    }
    case 'tool_call_result': {
      const toolBlock = blocks.find(
        (b) => b.type === 'tool_call' && b.toolCallId === event.toolCallId
      )
      if (toolBlock) {
        toolBlock.status = event.isError ? 'error' : 'done'
        toolBlock.output = event.output
        toolBlock.isError = event.isError
      }
      break
    }
    case 'ui_render': {
      blocks.push({
        type: 'ui_render',
        renderBlockId: event.renderBlockId,
        schema: event.schema,
      })
      break
    }
  }
}

export function flushAssistantMessage(
  remoteSessionId: string
): { conversationId: string; blocks: AssistantBlock[] } | null {
  const session = activeSessions.get(remoteSessionId)
  if (!session) return null
  const blocks = [...session.pendingAssistantBlocks]
  session.pendingAssistantBlocks = []
  if (blocks.length === 0) return null
  return { conversationId: session.conversationId, blocks }
}
