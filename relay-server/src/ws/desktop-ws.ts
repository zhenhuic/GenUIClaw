import WebSocket, { WebSocketServer } from 'ws'
import http from 'http'
import { randomUUID } from 'crypto'
import { getDb } from '../db'
import {
  registerDesktop,
  unregisterDesktop,
  forwardToWeb,
  accumulateAssistantEvent,
  flushAssistantMessage,
} from './relay'

const PING_INTERVAL_MS = 30_000

interface DesktopState {
  pairingKey: string | null
  pingTimer: NodeJS.Timeout | null
}

export function setupDesktopWss(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    if (url.pathname === '/desktop') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req)
      })
    }
  })

  wss.on('connection', (ws: WebSocket) => {
    const state: DesktopState = { pairingKey: null, pingTimer: null }
    console.log('[DesktopWS] desktop connected')

    state.pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }))
      }
    }, PING_INTERVAL_MS)

    ws.on('message', (raw: Buffer | string) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>
      } catch {
        return
      }

      switch (msg.type) {
        case 'register': {
          const pairingKey = msg.pairingKey as string
          const db = getDb()
          const agent = db
            .prepare('SELECT id FROM remote_agents WHERE pairing_key = ?')
            .get(pairingKey) as { id: string } | undefined

          if (!agent) {
            ws.send(JSON.stringify({ type: 'error', code: 'INVALID_KEY', message: 'Unknown pairing key' }))
            ws.close(1008, 'Invalid pairing key')
            return
          }

          // Persist models/skills config sent by desktop
          if (msg.models !== undefined || msg.skills !== undefined) {
            const configJson = JSON.stringify({ models: msg.models ?? [], skills: msg.skills ?? [] })
            db.prepare('UPDATE remote_agents SET config_json = ? WHERE pairing_key = ?').run(configJson, pairingKey)
          }

          state.pairingKey = pairingKey
          registerDesktop(pairingKey, ws)
          ws.send(JSON.stringify({ type: 'registered', pairingKey }))
          break
        }

        case 'agent_event': {
          const { remoteSessionId, event } = msg as { remoteSessionId: string; event: Record<string, unknown> }
          const sent = forwardToWeb(remoteSessionId, { type: 'agent_event', remoteSessionId, event })
          console.log(`[DesktopWS] agent_event type=${event?.type} remoteSessionId=${remoteSessionId} forwarded=${sent}`)

          // Accumulate assistant content for persistence
          accumulateAssistantEvent(remoteSessionId, event)

          // On session end, persist accumulated assistant message
          if (event?.type === 'session_end') {
            const flushed = flushAssistantMessage(remoteSessionId)
            if (flushed && flushed.blocks.length > 0) {
              try {
                const db = getDb()
                const msgId = randomUUID()
                db.prepare(
                  'INSERT INTO remote_messages (id, conversation_id, role, content_json, created_at) VALUES (?, ?, ?, ?, ?)'
                ).run(msgId, flushed.conversationId, 'assistant', JSON.stringify(flushed.blocks), Date.now())

                // Update conversation updated_at
                db.prepare('UPDATE remote_conversations SET updated_at = ? WHERE id = ?')
                  .run(Date.now(), flushed.conversationId)
              } catch (err) {
                console.error('[DesktopWS] Failed to persist assistant message:', err)
              }
            }
          }
          break
        }

        case 'title_update': {
          const { conversationId, title } = msg as { conversationId: string; title: string }
          if (conversationId && title && state.pairingKey) {
            try {
              const db = getDb()
              db.prepare('UPDATE remote_conversations SET title = ?, updated_at = ? WHERE id = ?')
                .run(title, Date.now(), conversationId)
            } catch (err) {
              console.error('[DesktopWS] Failed to update conversation title:', err)
            }
          }
          break
        }

        case 'pong':
          // heartbeat response, no action needed
          break
      }
    })

    ws.on('close', () => {
      console.log(`[DesktopWS] desktop disconnected pairingKey=${state.pairingKey}`)
      if (state.pingTimer) clearInterval(state.pingTimer)
      if (state.pairingKey) unregisterDesktop(state.pairingKey)
    })

    ws.on('error', (err) => {
      console.error('[DesktopWS] Error:', err.message)
    })
  })

  return wss
}
