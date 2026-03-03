import express from 'express'
import http from 'http'
import cors from 'cors'
import { getDb, closeDb } from './db'
import authRoutes from './routes/auth-routes'
import agentRoutes from './routes/agent-routes'
import convRoutes from './routes/conv-routes'
import { setupDesktopWss } from './ws/desktop-ws'
import { setupWebWss } from './ws/web-ws'

const PORT = parseInt(process.env.PORT || '3000', 10)
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'

const app = express()
const server = http.createServer(app)

// Middleware
app.use(cors({ origin: CORS_ORIGIN }))
app.use(express.json())

// Initialize DB
getDb()

// REST routes
app.use('/auth', authRoutes)
app.use('/agents', agentRoutes)
app.use('/conversations', convRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// WebSocket servers
setupDesktopWss(server)
setupWebWss(server)

// Start
server.listen(PORT, () => {
  console.log(`[RelayServer] Listening on port ${PORT}`)
  console.log(`[RelayServer] Desktop WS endpoint: ws://localhost:${PORT}/desktop`)
  console.log(`[RelayServer] Web WS endpoint: ws://localhost:${PORT}/web?token=<jwt>`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[RelayServer] Shutting down...')
  server.close(() => {
    closeDb()
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  server.close(() => {
    closeDb()
    process.exit(0)
  })
})
