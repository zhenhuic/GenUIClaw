/**
 * Relay protocol — shared between desktop client, mobile client, and Go relay server.
 *
 * All communication between desktop ↔ relay ↔ mobile uses JSON-encoded
 * WebSocket text frames conforming to these types.
 */

// ---- Mobile → Desktop (via relay) ----

export interface RelayRequest {
  type: 'request'
  id: string           // Unique request ID for matching responses
  method: string       // e.g. 'agent.start', 'conversations.list'
  params?: unknown     // Method parameters
}

// ---- Desktop → Mobile (via relay) ----

export interface RelayResponse {
  type: 'response'
  id: string           // Matching request ID
  result?: unknown     // Success payload
  error?: string       // Error message (mutually exclusive with result)
}

export interface RelayPushEvent {
  type: 'push'
  event: string        // e.g. 'agent:stream-event', 'conversation:title-updated'
  data: unknown        // Event payload (IpcAgentEvent, title update, etc.)
}

// ---- Control messages (relay ↔ client) ----

export type RelayControlAction =
  | 'device_code'          // relay → desktop: your device code
  | 'mobile_connected'     // relay → desktop: a mobile client joined
  | 'mobile_disconnected'  // relay → desktop: a mobile client left
  | 'ping'
  | 'pong'

export interface RelayControl {
  type: 'control'
  action: RelayControlAction
  payload?: unknown
}

// ---- Union type ----

export type RelayMessage = RelayRequest | RelayResponse | RelayPushEvent | RelayControl
