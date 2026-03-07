/**
 * Relay manager — singleton that manages the RelayClient lifecycle.
 *
 * Provides start/stop/status/test operations accessible from both
 * the app entry point (main/index.ts) and IPC handlers, enabling
 * dynamic activation without requiring an app restart.
 */

import { BrowserWindow } from 'electron'
import WebSocket from 'ws'
import log from 'electron-log'
import { RelayClient } from './relay-client'
import { ElectronTransportSender } from './transport'
import type { RemoteStatus } from '../../shared/types/ipc'

let relayClient: RelayClient | null = null
let mobileConnected = false
let currentRelayUrl = ''

/** Status change listeners (used to push updates to renderer). */
const statusListeners = new Set<(status: RemoteStatus) => void>()

function getStatus(): RemoteStatus {
  return {
    relayConnected: relayClient?.isConnected() ?? false,
    deviceCode: relayClient?.code ?? '',
    mobileConnected,
    relayUrl: currentRelayUrl,
  }
}

function notifyStatusChange(): void {
  const status = getStatus()
  for (const listener of statusListeners) {
    try {
      listener(status)
    } catch {
      // ignore listener errors
    }
  }
}

/**
 * Start the relay client and connect to the given relay URL.
 * If a client is already running, it is stopped first.
 */
async function start(relayUrl: string): Promise<string> {
  // Stop existing client if any
  if (relayClient) {
    await stop()
  }

  currentRelayUrl = relayUrl
  mobileConnected = false
  relayClient = new RelayClient(relayUrl)

  // Attach the main window as a title sender
  const mainWindow = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed())
  if (mainWindow) {
    relayClient.setTitleSenders([new ElectronTransportSender(mainWindow.webContents)])
  }

  // Listen for mobile connect/disconnect to track status
  relayClient.onStatus((status) => {
    mobileConnected = status === 'mobile_connected'
    notifyStatusChange()
  })

  const code = await relayClient.connect()
  log.info(`[RelayManager] Started. Device code: ${code}`)
  notifyStatusChange()
  return code
}

/** Stop the relay client and clean up. */
async function stop(): Promise<void> {
  if (relayClient) {
    relayClient.disconnect()
    relayClient = null
  }
  mobileConnected = false
  currentRelayUrl = ''
  log.info('[RelayManager] Stopped')
  notifyStatusChange()
}

/**
 * Regenerate the device pairing code.
 * Disconnects and reconnects with a new code, invalidating old sessions.
 */
async function regenerate(): Promise<string> {
  if (!relayClient) {
    throw new Error('Relay client is not running')
  }
  mobileConnected = false
  const newCode = await relayClient.regenerate()
  log.info(`[RelayManager] Regenerated. New device code: ${newCode}`)
  notifyStatusChange()
  return newCode
}

/**
 * Test connectivity to a relay server URL.
 * Opens a WebSocket, waits for the open event, measures latency, then closes.
 */
async function test(relayUrl: string): Promise<{ latencyMs: number }> {
  const baseUrl = relayUrl.replace(/\/+$/, '').replace(/\/ws\/desktop$/, '').replace(/\/ws\/mobile$/, '')
  // Use the health endpoint if available — fall back to a raw WebSocket open/close.
  // We test by attempting a WebSocket connection with a temp device code.
  const testUrl = `${baseUrl}/ws/desktop?token=test&code=TEST00`

  return new Promise((resolve, reject) => {
    const start = Date.now()
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error('Connection timed out (10s)'))
    }, 10000)

    const ws = new WebSocket(testUrl)

    ws.on('open', () => {
      clearTimeout(timeout)
      const latencyMs = Date.now() - start
      ws.close()
      resolve({ latencyMs })
    })

    ws.on('error', (err) => {
      clearTimeout(timeout)
      reject(new Error(`Connection failed: ${err.message}`))
    })
  })
}

/** Subscribe to status changes. Returns unsubscribe function. */
function onStatusChange(listener: (status: RemoteStatus) => void): () => void {
  statusListeners.add(listener)
  return () => statusListeners.delete(listener)
}

/** Get the current relay client instance (for use by index.ts cleanup). */
function getClient(): RelayClient | null {
  return relayClient
}

export const RelayManager = {
  start,
  stop,
  regenerate,
  test,
  getStatus,
  onStatusChange,
  getClient,
}
