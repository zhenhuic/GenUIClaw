import { useEffect, useRef, useCallback } from 'react'
import { useChatStore } from '../store/chat-store'
import type { IpcAgentEvent } from '../types'

function getRelayWsBase(): string {
  if (import.meta.env.VITE_RELAY_WS_URL) return import.meta.env.VITE_RELAY_WS_URL as string
  // Derive from current page location so mobile / LAN access works
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.hostname}:3000`
}
const RELAY_WS_BASE = getRelayWsBase()
console.log('[RelayWS] RELAY_WS_BASE =', RELAY_WS_BASE)

const RECONNECT_DELAY_MS = 2000
const MAX_RECONNECT_ATTEMPTS = 10

interface UseRelayWSOptions {
  token: string
  onSessionStarted?: (remoteSessionId: string, conversationId: string) => void
  onConversationCreated?: (conversationId: string) => void
  onError?: (message: string) => void
}

export function useRelayWS({ token, onSessionStarted, onConversationCreated, onError }: UseRelayWSOptions) {
  const ws = useRef<WebSocket | null>(null)
  const reconnectAttempt = useRef(0)
  const destroyed = useRef(false)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep callbacks in refs to avoid stale closures without requiring WS reconnection
  const onSessionStartedRef = useRef(onSessionStarted)
  const onConversationCreatedRef = useRef(onConversationCreated)
  const onErrorRef = useRef(onError)
  useEffect(() => { onSessionStartedRef.current = onSessionStarted }, [onSessionStarted])
  useEffect(() => { onConversationCreatedRef.current = onConversationCreated }, [onConversationCreated])
  useEffect(() => { onErrorRef.current = onError }, [onError])

  const setActiveRemoteSessionId = useChatStore((s) => s.setActiveRemoteSessionId)

  const connect = useCallback(() => {
    if (destroyed.current) return
    const url = `${RELAY_WS_BASE}/web?token=${encodeURIComponent(token)}`
    console.log('[RelayWS] connecting to', url)
    const socket = new WebSocket(url)
    ws.current = socket

    socket.onopen = () => {
      console.log('[RelayWS] connected ✓')
      reconnectAttempt.current = 0
    }

    socket.onmessage = (e: MessageEvent) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(e.data as string) as Record<string, unknown>
      } catch {
        console.warn('[RelayWS] failed to parse message:', e.data)
        return
      }

      const eventType = msg.type === 'agent_event'
        ? `agent_event(${(msg.event as Record<string, unknown>)?.type})`
        : String(msg.type)
      console.log('[RelayWS] received:', eventType)

      switch (msg.type) {
        case 'agent_event': {
          const event = msg.event as IpcAgentEvent
          useChatStore.getState().handleAgentEvent(event)
          console.log('[RelayWS] store messages after event:', useChatStore.getState().messages.length)
          break
        }
        case 'session_started': {
          const remoteSessionId = msg.remoteSessionId as string
          const conversationId = msg.conversationId as string
          console.log('[RelayWS] session_started remoteSessionId=', remoteSessionId)
          setActiveRemoteSessionId(remoteSessionId)
          onSessionStartedRef.current?.(remoteSessionId, conversationId)
          break
        }
        case 'conversation_created': {
          console.log('[RelayWS] conversation_created', msg.conversationId)
          onConversationCreatedRef.current?.(msg.conversationId as string)
          break
        }
        case 'error': {
          console.error('[RelayWS] server error:', msg.message)
          onErrorRef.current?.(msg.message as string)
          break
        }
        default:
          console.warn('[RelayWS] unknown message type:', msg.type)
      }
    }

    socket.onclose = (e) => {
      console.warn(`[RelayWS] closed code=${e.code} reason="${e.reason}" wasClean=${e.wasClean}`)
      if (!destroyed.current) {
        scheduleReconnect()
      }
    }

    socket.onerror = (e) => {
      console.error('[RelayWS] socket error', e)
    }
  }, [token, setActiveRemoteSessionId])

  const scheduleReconnect = useCallback(() => {
    if (destroyed.current || reconnectAttempt.current >= MAX_RECONNECT_ATTEMPTS) return
    const delay = Math.min(RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttempt.current), 30000)
    reconnectAttempt.current++
    console.log(`[RelayWS] reconnecting in ${delay}ms (attempt ${reconnectAttempt.current})`)
    reconnectTimer.current = setTimeout(() => {
      if (!destroyed.current) connect()
    }, delay)
  }, [connect])

  useEffect(() => {
    destroyed.current = false
    connect()
    return () => {
      destroyed.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting')
        ws.current = null
      }
    }
  }, [connect])

  const sendMessage = useCallback(
    (text: string, agentId: string, conversationId?: string, modelId?: string, skillIds?: string[]) => {
      const state = ws.current?.readyState
      console.log('[RelayWS] sendMessage readyState=', state, 'text=', text.slice(0, 40))
      if (state === WebSocket.OPEN) {
        ws.current!.send(
          JSON.stringify({ type: 'start_session', agentId, text, conversationId, modelId, skillIds })
        )
      } else {
        console.warn('[RelayWS] sendMessage: socket not open, state=', state)
      }
    },
    []
  )

  const interrupt = useCallback((remoteSessionId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'interrupt', remoteSessionId }))
    }
  }, [])

  const sendUIAction = useCallback(
    (remoteSessionId: string, renderBlockId: string, actionId: string, data: Record<string, unknown>) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({ type: 'ui_action', remoteSessionId, renderBlockId, actionId, data })
        )
      }
    },
    []
  )

  return { sendMessage, interrupt, sendUIAction }
}
