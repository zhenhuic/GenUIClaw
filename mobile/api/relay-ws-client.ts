/**
 * Mobile-side WebSocket client that connects to the public relay server.
 *
 * Provides:
 *  - request/response pattern (with Promise + timeout)
 *  - push event subscription
 *  - auto-reconnect
 */

import type { RelayRequest, RelayResponse, RelayPushEvent, RelayControl, RelayMessage } from '@shared/types/relay-protocol'

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const REQUEST_TIMEOUT_MS = 30_000
const RECONNECT_DELAY_MS = 3_000
const HEARTBEAT_INTERVAL_MS = 20_000

export class RelayWsClient {
  private ws: WebSocket | null = null
  private pendingRequests = new Map<string, PendingRequest>()
  private pushListeners = new Map<string, Set<(data: unknown) => void>>()
  private controlListeners = new Set<(msg: RelayControl) => void>()
  private _connected = false
  private _closed = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private _deviceCode = ''
  private _relayUrl = ''

  get connected(): boolean { return this._connected }
  get deviceCode(): string { return this._deviceCode }

  /**
   * Connect to the relay server using a device code.
   */
  connect(relayUrl: string, deviceCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this._relayUrl = relayUrl
      this._deviceCode = deviceCode
      this._closed = false

      const url = `${relayUrl}/ws/mobile?code=${encodeURIComponent(deviceCode)}`

      try {
        this.ws = new WebSocket(url)
      } catch (err) {
        reject(err)
        return
      }

      let resolved = false

      this.ws.onopen = () => {
        this._connected = true
        this.startHeartbeat()
        if (!resolved) {
          resolved = true
          resolve()
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const msg: RelayMessage = JSON.parse(event.data as string)
          this.handleMessage(msg)
        } catch {
          // Ignore unparseable messages
        }
      }

      this.ws.onclose = () => {
        this._connected = false
        this.stopHeartbeat()
        this.rejectAllPending('Connection closed')
        if (!resolved) {
          resolved = true
          reject(new Error('Connection closed before open'))
        }
        if (!this._closed) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = () => {
        if (!resolved) {
          resolved = true
          reject(new Error('WebSocket connection failed'))
        }
      }
    })
  }

  /**
   * Send a request and wait for the matching response.
   * Returns the `result` field from the RelayResponse (which wraps IpcResult).
   */
  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'))
        return
      }

      const id = crypto.randomUUID()
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Request timeout: ${method}`))
      }, REQUEST_TIMEOUT_MS)

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      })

      const msg: RelayRequest = { type: 'request', id, method, params }
      this.ws.send(JSON.stringify(msg))
    })
  }

  /**
   * Subscribe to push events. Returns an unsubscribe function.
   */
  onPush(event: string, callback: (data: unknown) => void): () => void {
    let listeners = this.pushListeners.get(event)
    if (!listeners) {
      listeners = new Set()
      this.pushListeners.set(event, listeners)
    }
    listeners.add(callback)
    return () => listeners!.delete(callback)
  }

  /**
   * Subscribe to control events (mobile_connected, etc).
   */
  onControl(callback: (msg: RelayControl) => void): () => void {
    this.controlListeners.add(callback)
    return () => this.controlListeners.delete(callback)
  }

  /**
   * Disconnect and stop reconnecting.
   */
  disconnect(): void {
    this._closed = true
    this._connected = false
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.rejectAllPending('Disconnected')
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }

  // ---- Internal ----

  private handleMessage(msg: RelayMessage): void {
    switch (msg.type) {
      case 'response': {
        const resp = msg as RelayResponse
        const pending = this.pendingRequests.get(resp.id)
        if (pending) {
          this.pendingRequests.delete(resp.id)
          clearTimeout(pending.timer)
          if (resp.error) {
            pending.reject(new Error(resp.error))
          } else {
            pending.resolve(resp.result)
          }
        }
        break
      }
      case 'push': {
        const push = msg as RelayPushEvent
        const listeners = this.pushListeners.get(push.event)
        if (listeners) {
          for (const cb of listeners) {
            try { cb(push.data) } catch { /* ignore listener errors */ }
          }
        }
        break
      }
      case 'control': {
        const ctrl = msg as RelayControl
        for (const cb of this.controlListeners) {
          try { cb(ctrl) } catch { /* ignore */ }
        }
        break
      }
    }
  }

  private rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer)
      pending.reject(new Error(reason))
    }
    this.pendingRequests.clear()
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const ping: RelayControl = { type: 'control', action: 'ping' }
        this.ws.send(JSON.stringify(ping))
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
    if (this.reconnectTimer || this._closed) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this._closed) return
      this.connect(this._relayUrl, this._deviceCode).catch(() => {
        // Will retry via onclose → scheduleReconnect
      })
    }, RECONNECT_DELAY_MS)
  }
}

/** Singleton instance */
export const relayClient = new RelayWsClient()
