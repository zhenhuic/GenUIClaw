import { app, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import log from 'electron-log'
import { initDatabase, closeDatabase } from './storage/database'
import { registerAllHandlers } from './ipc/index'
import { createMainWindow } from './window'
import { registerUIWindowHandlers } from './ui-window'
import { AbortRegistry } from './agent/abort-controller'
import { getSetting, setSetting } from './storage/settings'
import { relayClient } from './remote-control/ws-client'
import type { RemoteControlConfig } from '../shared/types/settings'

// Configure electron-log
log.transports.file.level = 'info'
log.transports.console.level = 'debug'

let mainWindow: BrowserWindow | null = null

app.whenReady().then(() => {
  // Initialize SQLite database
  initDatabase()

  // Register all IPC handlers
  registerAllHandlers()
  registerUIWindowHandlers()

  // Auto-generate pairing key if not set
  const rc = getSetting('remoteControl') as RemoteControlConfig
  if (!rc.pairingKey) {
    setSetting('remoteControl', { ...rc, pairingKey: randomUUID() })
  }

  // Create main window
  mainWindow = createMainWindow()

  // Start relay client after window is ready (so status push has a destination)
  mainWindow.webContents.once('did-finish-load', () => {
    const config = getSetting('remoteControl') as RemoteControlConfig
    if (config.enabled && config.serverUrl && config.pairingKey) {
      relayClient.start(config)
    }
  })

  // macOS: re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })

  log.info(`[App] GenUIClaw started. Electron ${process.versions.electron}, Node ${process.versions.node}`)
})

// Quit on all windows closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Cleanup before quit
app.on('before-quit', () => {
  AbortRegistry.interruptAll()
  relayClient.stop()
  closeDatabase()
  log.info('[App] GenUIClaw shutting down')
})
