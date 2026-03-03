import WebSocket from 'ws'
import { randomUUID } from 'crypto'
import { BrowserWindow } from 'electron'
import log from 'electron-log'
import type { IpcAgentEvent, RemoteControlStatus } from '../../shared/types/ipc'
import type { RemoteControlConfig } from '../../shared/types/settings'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import {
  serializeToRelay,
  deserializeFromRelay,
  type DesktopToRelayMessage,
  type AgentStartMessage,
  type AgentInterruptMessage,
  type UIActionMessage,
} from './relay-protocol'

import { runAgentSession, serializeUIAction } from '../agent/runner'
import { AbortRegistry } from '../agent/abort-controller'
import { saveMessage } from '../storage/messages'
import { createRemoteConversation, getConversationByRelayId } from '../storage/conversations'
import { generateConversationTitle } from '../agent/title-generator'
import { getAllSettings } from '../storage/settings'
import { listAllSkills } from '../storage/skills'
import type { AppSettings } from '../../shared/types/settings'

interface RemoteSession {
  localSessionId: string
  conversationId: string      // local desktop DB conversation ID
  relayConversationId: string // relay-server DB conversation ID
}

const HEARTBEAT_INTERVAL_MS = 30_000
const INITIAL_RECONNECT_DELAY_MS = 1_000
const MAX_RECONNECT_DELAY_MS = 30_000
const MAX_RECONNECT_ATTEMPTS = 10
const CLIENT_VERSION = '0.1.0'

class RelayWebSocketClient {
  private ws: WebSocket | null = null
  private config: RemoteControlConfig | null = null
  private status: RemoteControlStatus = { state: 'disabled' }
  private remoteSessions = new Map<string, RemoteSession>()
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectAttempt = 0
  private destroyed = false

  // ---- Public API ----

  start(config: RemoteControlConfig): void {
    this.destroyed = false
    this.config = config
    if (!config.enabled || !config.serverUrl || !config.pairingKey) {
      this.setStatus({ state: 'disabled' })
      return
    }
    this.connect()
  }

  stop(): void {
    this.destroyed = true
    this.clearTimers()
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close(1000, 'Client stopping')
      this.ws = null
    }
    this.setStatus({ state: 'disabled' })
  }

  restart(config: RemoteControlConfig): void {
    this.stop()
    this.destroyed = false
    this.reconnectAttempt = 0
    this.start(config)
  }

  getStatus(): RemoteControlStatus {
    return this.status
  }

  // ---- Private connection management ----

  private connect(): void {
    if (!this.config) return
    const { serverUrl, pairingKey } = this.config
    // Ensure WebSocket URL includes /desktop path for relay server
    const base = serverUrl.replace(/\/+$/, '')
    const wsUrl = base.endsWith('/desktop') ? base : base + '/desktop'

    this.setStatus({ state: 'connecting', serverUrl })
    log.info(`[RelayWS] Connecting to ${wsUrl}`)

    try {
      this.ws = new WebSocket(wsUrl)
    } catch (err) {
      log.error('[RelayWS] Failed to create WebSocket:', err)
      this.scheduleReconnect()
      return
    }

    this.ws.on('open', () => {
      log.info('[RelayWS] Connected. Registering with pairing key.')
      this.reconnectAttempt = 0
      const settings = this.getAppSettings()
      const models = settings.models
        .filter((m) => m.enabled)
        .map((m) => ({ id: m.id, name: m.name }))
      const skills = listAllSkills()
        .filter((s) => s.enabled)
        .map((s) => ({ id: s.id, name: s.name }))
      this.sendMessage({ type: 'register', pairingKey, clientVersion: CLIENT_VERSION, models, skills })
      this.startHeartbeat()
    })

    this.ws.on('message', (raw: Buffer | string) => {
      const text = typeof raw === 'string' ? raw : raw.toString('utf8')
      const msg = deserializeFromRelay(text)
      if (!msg) {
        log.warn('[RelayWS] Received unparseable message:', text.slice(0, 200))
        return
      }
      this.handleMessage(msg)
    })

    this.ws.on('close', (code) => {
      log.info(`[RelayWS] Connection closed: ${code}`)
      this.stopHeartbeat()
      if (!this.destroyed) {
        this.setStatus({
          state: 'disconnected',
          serverUrl: this.config?.serverUrl ?? '',
          error: `Closed: ${code}`,
        })
        this.scheduleReconnect()
      }
    })

    this.ws.on('error', (err) => {
      log.error('[RelayWS] WebSocket error:', err.message)
    })
  }

  private handleMessage(msg: ReturnType<typeof deserializeFromRelay>): void {
    if (!msg) return
    switch (msg.type) {
      case 'registered':
        log.info(`[RelayWS] Registered successfully with key: ${msg.pairingKey}`)
        this.setStatus({
          state: 'connected',
          serverUrl: this.config!.serverUrl,
          pairingKey: msg.pairingKey,
        })
        break
      case 'ping':
        this.sendMessage({ type: 'pong', ts: msg.ts })
        break
      case 'agent_start':
        this.handleAgentStart(msg)
        break
      case 'agent_interrupt':
        this.handleAgentInterrupt(msg)
        break
      case 'ui_action':
        this.handleUIAction(msg)
        break
    }
  }

  private handleAgentStart(msg: AgentStartMessage): void {
    log.info(`[RelayWS] agent_start received: remoteSessionId=${msg.remoteSessionId}`)

    const relayConversationId = msg.conversationId
    // Map relay's conversation ID to desktop conversation (relay and desktop use different DBs)
    let conversationId: string
    const existingConv = relayConversationId ? getConversationByRelayId(relayConversationId) : null
    if (existingConv) {
      conversationId = existingConv.id
    } else {
      const conv = createRemoteConversation('Remote Session', relayConversationId)
      conversationId = conv.id
      this.notifyMainWindow(IPC_CHANNELS.CONVERSATION_TITLE_UPDATED, {
        conversationId: conv.id,
        title: 'Remote Session',
      })
    }

    const localSessionId = randomUUID()
    this.remoteSessions.set(msg.remoteSessionId, { localSessionId, conversationId, relayConversationId })

    try {
      saveMessage(conversationId, 'user', [{ type: 'text', text: msg.text }], localSessionId)
    } catch (err) {
      log.error('[RelayWS] Failed to save remote user message:', err)
    }

    const mainWindow = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed())
    const settings = this.getAppSettings()

    // Notify main window to switch to this conversation and show the user message
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.REMOTE_ACTIVATE_CONVERSATION, {
        conversationId,
        userMessage: msg.text,
        sessionId: localSessionId,
      })
    }

    setImmediate(async () => {
      await runAgentSession({
        sessionId: localSessionId,
        prompt: msg.text,
        conversationId,
        allowedTools: settings.allowedTools,
        mcpServers: settings.mcpServers,
        cwd: settings.defaultCwd || undefined,
        systemPrompt: settings.systemPrompt || undefined,
        sender: mainWindow ? mainWindow.webContents : this.createNullWebContents(),
        modelId: msg.modelId,
        skillIds: msg.skillIds,
        onEvent: (event: IpcAgentEvent) => {
          this.sendAgentEvent(msg.remoteSessionId, event)
        },
      })

      const title = await generateConversationTitle(conversationId, msg.modelId, mainWindow ?? null)
      if (title && relayConversationId) {
        this.sendMessage({ type: 'title_update', conversationId: relayConversationId, title })
      }
    })
  }

  private handleAgentInterrupt(msg: AgentInterruptMessage): void {
    const session = this.remoteSessions.get(msg.remoteSessionId)
    if (!session) {
      log.warn(`[RelayWS] agent_interrupt for unknown remoteSession: ${msg.remoteSessionId}`)
      return
    }
    AbortRegistry.interrupt(session.localSessionId)
  }

  private handleUIAction(msg: UIActionMessage): void {
    const session = this.remoteSessions.get(msg.remoteSessionId)
    if (!session) {
      log.warn(`[RelayWS] ui_action for unknown remoteSession: ${msg.remoteSessionId}`)
      return
    }

    const mainWindow = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed())
    const settings = this.getAppSettings()
    const newSessionId = randomUUID()
    const prompt = serializeUIAction(msg.actionId, msg.data, msg.renderBlockId)

    this.remoteSessions.set(msg.remoteSessionId, { ...session, localSessionId: newSessionId })

    setImmediate(async () => {
      await runAgentSession({
        sessionId: newSessionId,
        prompt,
        conversationId: session.conversationId,
        allowedTools: settings.allowedTools,
        mcpServers: settings.mcpServers,
        cwd: settings.defaultCwd || undefined,
        systemPrompt: settings.systemPrompt || undefined,
        sender: mainWindow ? mainWindow.webContents : this.createNullWebContents(),
        onEvent: (event: IpcAgentEvent) => {
          this.sendAgentEvent(msg.remoteSessionId, event)
        },
      })
    })
  }

  private sendAgentEvent(remoteSessionId: string, event: IpcAgentEvent): void {
    this.sendMessage({ type: 'agent_event', remoteSessionId, event })
  }

  // ---- Reconnection ----

  private scheduleReconnect(): void {
    if (this.destroyed || this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
        log.warn('[RelayWS] Max reconnect attempts reached. Giving up.')
        this.setStatus({
          state: 'disconnected',
          serverUrl: this.config?.serverUrl ?? '',
          error: 'Max reconnect attempts reached',
        })
      }
      return
    }

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempt),
      MAX_RECONNECT_DELAY_MS
    )
    this.reconnectAttempt++
    this.setStatus({
      state: 'reconnecting',
      serverUrl: this.config?.serverUrl ?? '',
      attempt: this.reconnectAttempt,
    })
    log.info(`[RelayWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`)

    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed) this.connect()
    }, delay)
  }

  // ---- Heartbeat ----

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
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

  // ---- Utilities ----

  private clearTimers(): void {
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private sendMessage(msg: DesktopToRelayMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(serializeToRelay(msg))
    } else {
      log.warn('[RelayWS] Attempted to send while not connected:', msg.type)
    }
  }

  private setStatus(status: RemoteControlStatus): void {
    this.status = status
    this.notifyMainWindow(IPC_CHANNELS.REMOTE_CONTROL_STATUS, status)
  }

  private notifyMainWindow(channel: string, data: unknown): void {
    const mainWindow = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed())
    if (mainWindow) {
      mainWindow.webContents.send(channel, data)
    }
  }

  private getAppSettings(): AppSettings {
    return getAllSettings()
  }

  private createNullWebContents(): Electron.WebContents {
    return {
      send: () => {},
      isDestroyed: () => true,
    } as unknown as Electron.WebContents
  }
}

export const relayClient = new RelayWebSocketClient()
