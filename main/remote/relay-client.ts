/**
 * Relay client — desktop-side WebSocket client that connects to the
 * public relay server, registers a room, and handles requests from
 * mobile clients that are forwarded through the relay.
 */

import WebSocket from 'ws'
import log from 'electron-log'
import type {
  RelayMessage,
  RelayRequest,
  RelayResponse,
  RelayPushEvent,
  RelayControl,
} from '../../shared/types/relay-protocol'
import { generateDeviceCode, generateSecret, createToken } from './auth'
import { RemoteTransportSender } from './remote-transport'
import { handleRemoteRequest } from './remote-handler'
import type { TransportSender } from './transport'

const RECONNECT_DELAY_MS = 3000
const HEARTBEAT_INTERVAL_MS = 20000

export class RelayClient {
  private ws: WebSocket | null = null
  private deviceCode = ''
  private secret: string
  private remoteSender: RemoteTransportSender
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private closed = false
  private _titleSenders: TransportSender[] = []

  /** Listeners notified when mobile connects / disconnects. */
  private statusListeners = new Set<(status: 'mobile_connected' | 'mobile_disconnected') => void>()

  constructor(private relayUrl: string) {
    this.secret = generateSecret()
    this.remoteSender = new RemoteTransportSender(this)
  }

  /** The current device pairing code. Empty string if not connected. */
  get code(): string {
    return this.deviceCode
  }

  /** The TransportSender that pushes to the mobile client via this relay connection. */
  get sender(): TransportSender {
    return this.remoteSender
  }

  /**
   * Connect to the relay server and register a room.
   * Resolves with the device code once the relay confirms registration.
   * On reconnect, the same device code is reused so mobile clients stay connected.
   */
  connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.ws) {
        this.ws.removeAllListeners()
        this.ws.close()
      }

      // Only generate a new code on first connect; reuse on reconnect
      if (!this.deviceCode) {
        this.deviceCode = generateDeviceCode()
      }
      const token = createToken(this.secret)

      // relayUrl should be the server root (e.g. ws://localhost:9527).
      // Strip any trailing path/slash to avoid double-pathing.
      const baseUrl = this.relayUrl.replace(/\/+$/, '').replace(/\/ws\/desktop$/, '').replace(/\/ws\/mobile$/, '')
      const url = `${baseUrl}/ws/desktop?token=${encodeURIComponent(token)}&code=${this.deviceCode}`

      log.info(`[Relay] Connecting to ${url} with code ${this.deviceCode}...`)

      const ws = new WebSocket(url)
      this.ws = ws

      let resolved = false

      ws.on('open', () => {
        log.info(`[Relay] Connected. Device code: ${this.deviceCode}`)
        this.startHeartbeat()
        if (!resolved) {
          resolved = true
          resolve(this.deviceCode)
        }
      })

      ws.on('message', (raw: WebSocket.Data) => {
        try {
          const msg: RelayMessage = JSON.parse(raw.toString())
          this.handleMessage(msg)
        } catch (err) {
          log.warn('[Relay] Failed to parse message:', err)
        }
      })

      ws.on('close', (code, reason) => {
        log.info(`[Relay] Connection closed: ${code} ${reason}`)
        this.stopHeartbeat()
        if (!resolved) {
          resolved = true
          reject(new Error(`Relay connection closed: ${code}`))
        }
        if (!this.closed) {
          this.scheduleReconnect()
        }
      })

      ws.on('error', (err) => {
        log.error('[Relay] WebSocket error:', err.message)
        if (!resolved) {
          resolved = true
          reject(err)
        }
        // Ensure reconnect is scheduled even if 'close' doesn't fire
        if (!this.closed) {
          this.scheduleReconnect()
        }
      })
    })
  }

  /** Push an event to the mobile client(s) via the relay. */
  pushToMobile(channel: string, data: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const msg: RelayPushEvent = { type: 'push', event: channel, data }
    this.ws.send(JSON.stringify(msg))
  }

  /** Whether the WebSocket is currently open. */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /** Register senders that should receive title-updated notifications. */
  setTitleSenders(senders: TransportSender[]): void {
    this._titleSenders = senders
  }

  /** Subscribe to mobile connection status changes. Returns unsubscribe function. */
  onStatus(listener: (status: 'mobile_connected' | 'mobile_disconnected') => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  /** Disconnect and stop reconnecting. */
  disconnect(): void {
    this.closed = true
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close()
      this.ws = null
    }
    this.deviceCode = ''
    log.info('[Relay] Disconnected')
  }

  /**
   * Regenerate the device code: disconnect, generate a new code, reconnect.
   * Old mobile sessions using the previous code will be invalidated.
   * Returns the new device code.
   */
  async regenerate(): Promise<string> {
    // Disconnect current session (clears device code)
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close()
      this.ws = null
    }
    // Force a new code on next connect
    this.deviceCode = ''
    this.closed = false
    log.info('[Relay] Regenerating device code...')
    return this.connect()
  }

  // ---- Internal ----

  private handleMessage(msg: RelayMessage): void {
    switch (msg.type) {
      case 'request':
        this.handleRequest(msg as RelayRequest)
        break
      case 'control':
        this.handleControl(msg as RelayControl)
        break
      default:
        // Ignore responses and pushes from relay (we don't send requests to the relay)
        break
    }
  }

  private async handleRequest(req: RelayRequest): Promise<void> {
    log.info(`[Relay] Request: ${req.method} (id=${req.id})`)

    // Build title senders: local Electron window + remote mobile
    const titleSenders = [...this._titleSenders, this.remoteSender]

    const response = await handleRemoteRequest(req, this.remoteSender, titleSenders)

    // Send response back through relay to mobile
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(response))
    }
  }

  private handleControl(msg: RelayControl): void {
    switch (msg.action) {
      case 'device_code':
        // Relay confirmed our device code (may differ from requested)
        if (typeof msg.payload === 'string') {
          this.deviceCode = msg.payload
        }
        log.info(`[Relay] Device code confirmed: ${this.deviceCode}`)
        break

      case 'mobile_connected':
        log.info('[Relay] Mobile client connected')
        for (const listener of this.statusListeners) listener('mobile_connected')
        break

      case 'mobile_disconnected':
        log.info('[Relay] Mobile client disconnected')
        for (const listener of this.statusListeners) listener('mobile_disconnected')
        break

      case 'ping':
        // Respond with pong
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const pong: RelayControl = { type: 'control', action: 'pong' }
          this.ws.send(JSON.stringify(pong))
        }
        break

      default:
        break
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping()
      }
    }, HEARTBEAT_INTERVAL_MS)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    log.info(`[Relay] Reconnecting in ${RECONNECT_DELAY_MS}ms...`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect().catch((err) => {
        log.error('[Relay] Reconnect failed:', err.message)
      })
    }, RECONNECT_DELAY_MS)
  }
}
