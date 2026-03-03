import WebSocket, { WebSocketServer } from 'ws'
import http from 'http'
import { randomUUID } from 'crypto'
import { verifyToken } from '../auth'
import { getDb } from '../db'
import {
  getDesktopSocket,
  createSession,
  getSession,
  removeSessionsForWebSocket,
  forwardToDesktop,
} from './relay'

export function setupWebWss(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    if (url.pathname === '/web') {
      // Authenticate via query token
      const token = url.searchParams.get('token')
      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
        socket.destroy()
        return
      }

      let userId: string
      let userEmail: string
      try {
        const payload = verifyToken(token)
        userId = payload.userId
        userEmail = payload.email
      } catch {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
        socket.destroy()
        return
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        ;(ws as WebSocket & { userId: string; userEmail: string }).userId = userId
        ;(ws as WebSocket & { userId: string; userEmail: string }).userEmail = userEmail
        wss.emit('connection', ws, req)
      })
    }
  })

  wss.on('connection', (ws: WebSocket) => {
    const userId = (ws as WebSocket & { userId: string }).userId
    console.log(`[WebWS] client connected userId=${userId}`)

    ws.on('close', (code, reason) => {
      console.log(`[WebWS] client disconnected userId=${userId} code=${code} reason=${reason.toString()}`)
      removeSessionsForWebSocket(ws)
    })

    ws.on('error', (err) => {
      console.error('[WebWS] Error:', err.message)
    })

    ws.on('message', (raw: Buffer | string) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>
      } catch {
        return
      }

      console.log(`[WebWS] received type=${msg.type} userId=${userId}`)

      switch (msg.type) {
        case 'start_session': {
          const { agentId, text, conversationId: existingConvId, modelId, skillIds } = msg as {
            agentId: string
            text: string
            conversationId?: string
            modelId?: string
            skillIds?: string[]
          }

          const db = getDb()
          const agent = db
            .prepare('SELECT id, pairing_key FROM remote_agents WHERE id = ? AND user_id = ?')
            .get(agentId, userId) as { id: string; pairing_key: string } | undefined

          if (!agent) {
            console.warn(`[WebWS] start_session: agent not found agentId=${agentId}`)
            ws.send(JSON.stringify({ type: 'error', message: 'Agent not found' }))
            return
          }

          const desktopSocket = getDesktopSocket(agent.pairing_key)
          if (!desktopSocket || desktopSocket.readyState !== WebSocket.OPEN) {
            console.warn(`[WebWS] start_session: desktop not connected pairingKey=${agent.pairing_key} state=${desktopSocket?.readyState}`)
            ws.send(JSON.stringify({ type: 'error', message: 'Desktop client not connected' }))
            return
          }

          // Get or create conversation
          let conversationId = existingConvId || ''
          if (!conversationId) {
            const convId = randomUUID()
            const now = Date.now()
            db.prepare(
              'INSERT INTO remote_conversations (id, agent_id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
            ).run(convId, agentId, userId, 'New Conversation', now, now)
            conversationId = convId

            // Notify web client of new conversation
            ws.send(JSON.stringify({ type: 'conversation_created', conversationId: convId }))
          }

          // Save user message
          const msgId = randomUUID()
          db.prepare(
            'INSERT INTO remote_messages (id, conversation_id, role, content_json, created_at) VALUES (?, ?, ?, ?, ?)'
          ).run(msgId, conversationId, 'user', JSON.stringify([{ type: 'text', text }]), Date.now())

          // Create relay session
          const remoteSessionId = createSession(agentId, userId, conversationId, desktopSocket, ws)

          // Forward to desktop
          desktopSocket.send(
            JSON.stringify({
              type: 'agent_start',
              remoteSessionId,
              conversationId,
              text,
              modelId,
              skillIds,
            })
          )

          console.log(`[WebWS] session_started remoteSessionId=${remoteSessionId} conversationId=${conversationId}`)
          ws.send(JSON.stringify({ type: 'session_started', remoteSessionId, conversationId }))
          break
        }

        case 'interrupt': {
          const { remoteSessionId } = msg as { remoteSessionId: string }
          const session = getSession(remoteSessionId)
          if (!session) return
          if (session.userId !== userId) return

          session.desktopSocket.send(JSON.stringify({ type: 'agent_interrupt', remoteSessionId }))
          break
        }

        case 'ui_action': {
          const { remoteSessionId, renderBlockId, actionId, data } = msg as {
            remoteSessionId: string
            renderBlockId: string
            actionId: string
            data: Record<string, unknown>
          }
          const session = getSession(remoteSessionId)
          if (!session || session.userId !== userId) return

          session.desktopSocket.send(
            JSON.stringify({ type: 'ui_action', remoteSessionId, renderBlockId, actionId, data })
          )
          break
        }
      }
    })
  })

  return wss
}
