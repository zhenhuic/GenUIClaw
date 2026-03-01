import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import log from 'electron-log'

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0f0f11',
    show: false, // Show after ready-to-show to avoid flash
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Preload needs Node.js APIs
      webSecurity: true,
      spellcheck: false,
    },
  })

  // Show window once content is ready — prevents blank flash
  win.once('ready-to-show', () => {
    win.show()
    log.info('[Window] Main window shown')
  })

  // Open external links in the system browser, not Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
    log.info(`[Window] Loaded dev server: ${process.env.VITE_DEV_SERVER_URL}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
    log.info('[Window] Loaded production renderer')
  }

  return win
}
