import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import log from 'electron-log'
import type { UISchema } from '../shared/types/ui-schema'
import { IPC_CHANNELS } from '../shared/constants/ipc-channels'

interface UIWindowContext {
  sessionId: string
  renderBlockId: string
  schema: UISchema
  parentSender: Electron.WebContents
}

const openWindows = new Map<string, BrowserWindow>()
const pendingSchemas = new Map<number, UIWindowContext>()

function estimateWindowSize(schema: UISchema): { width: number; height: number } {
  const components = Object.values(schema.components)
  // 提高默认尺寸，减少内容被裁剪
  let width = 720
  let height = 480

  for (const comp of components) {
    switch (comp.type) {
      case 'table': {
        const cols = comp.columns?.length ?? 0
        const rows = comp.rows?.length ?? 0
        width = Math.max(width, Math.min(400 + cols * 130, 1200))
        height = Math.max(height, 200 + Math.min(rows, 15) * 44)
        break
      }
      case 'chart':
        width = Math.max(width, 760)
        height = Math.max(height, 520)
        break
      case 'form': {
        const fields = comp.fields?.length ?? 0
        width = Math.max(width, 560)
        height = Math.max(height, 220 + fields * 80)
        break
      }
      case 'container': {
        if (comp.direction === 'row') width = Math.max(width, 800)
        if (comp.childIds?.length) height = Math.max(height, 120 + comp.childIds.length * 80)
        break
      }
      case 'text':
        height += 48
        break
      case 'card':
        height += 100
        break
      default:
        height += 72
    }
  }

  const display = screen.getPrimaryDisplay()
  const maxW = Math.floor(display.workAreaSize.width * 0.9)
  const maxH = Math.floor(display.workAreaSize.height * 0.88)

  return {
    width: Math.min(width, maxW),
    height: Math.min(height, maxH),
  }
}

export function openUIWindow(ctx: UIWindowContext): void {
  const windowKey = ctx.renderBlockId

  const existing = openWindows.get(windowKey)
  if (existing && !existing.isDestroyed()) {
    existing.focus()
    return
  }

  const { width, height } = estimateWindowSize(ctx.schema)

  const win = new BrowserWindow({
    width,
    height,
    minWidth: 400,
    minHeight: 300,
    title: 'Kaleidoscope — Dynamic UI',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  openWindows.set(windowKey, win)
  pendingSchemas.set(win.webContents.id, ctx)

  win.once('ready-to-show', () => {
    win.show()
    log.info(`[UIWindow] Opened for renderBlockId=${ctx.renderBlockId} (${width}x${height})`)
  })

  win.on('closed', () => {
    openWindows.delete(windowKey)
    pendingSchemas.delete(win.webContents.id)
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}ui-window.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/ui-window.html'))
  }
}

export function registerUIWindowHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.UI_WINDOW_ACTION, (_event, payload) => {
    const { sessionId, renderBlockId, actionId, data } = payload
    log.info(`[UIWindow] Action received: actionId=${actionId}, renderBlockId=${renderBlockId}`)

    const ctx = findContextByRenderBlockId(renderBlockId)
    if (ctx && ctx.parentSender && !ctx.parentSender.isDestroyed()) {
      ctx.parentSender.send(IPC_CHANNELS.AGENT_STREAM_EVENT, {
        type: 'ui_action_received',
        sessionId,
        renderBlockId,
        actionId,
        data,
      })
    }

    return { data: { status: 'ok' } }
  })

  ipcMain.handle(IPC_CHANNELS.UI_WINDOW_GET_SCHEMA, (event) => {
    const ctx = pendingSchemas.get(event.sender.id)
    if (!ctx) {
      log.warn(`[UIWindow] No pending schema for webContents id=${event.sender.id}`)
      return { data: null }
    }
    log.info(`[UIWindow] Schema delivered to webContents id=${event.sender.id}`)
    return {
      data: {
        sessionId: ctx.sessionId,
        renderBlockId: ctx.renderBlockId,
        schema: ctx.schema,
      },
    }
  })
}

function findContextByRenderBlockId(renderBlockId: string): UIWindowContext | undefined {
  for (const ctx of pendingSchemas.values()) {
    if (ctx.renderBlockId === renderBlockId) return ctx
  }
  return undefined
}
