import { app, BrowserWindow } from 'electron'
import log from 'electron-log'
import { initDatabase, closeDatabase } from './storage/database'
import { registerAllHandlers } from './ipc/index'
import { createMainWindow } from './window'
import { registerUIWindowHandlers } from './ui-window'
import { AbortRegistry } from './agent/abort-controller'

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

  // Create main window
  mainWindow = createMainWindow()

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
  closeDatabase()
  log.info('[App] GenUIClaw shutting down')
})
