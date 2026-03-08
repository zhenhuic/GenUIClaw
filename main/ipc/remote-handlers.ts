import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { RelayManager } from '../remote/relay-manager'
import { updateSettings } from '../storage/settings'
import log from 'electron-log'

export function registerRemoteHandlers(): void {
  // Start relay client with given URL
  ipcMain.handle(IPC_CHANNELS.REMOTE_START, async (_event, relayUrl: string) => {
    try {
      const deviceCode = await RelayManager.start(relayUrl)
      // Persist the enabled state + URL
      updateSettings({ remoteAccess: { enabled: true, relayUrl } })
      return { data: { deviceCode } }
    } catch (err) {
      log.error('[IPC] remote:start error:', err)
      return { error: (err as Error).message }
    }
  })

  // Stop relay client
  ipcMain.handle(IPC_CHANNELS.REMOTE_STOP, async () => {
    try {
      await RelayManager.stop()
      // Persist disabled state
      updateSettings({ remoteAccess: { enabled: false, relayUrl: '' } })
      return { data: null }
    } catch (err) {
      log.error('[IPC] remote:stop error:', err)
      return { error: (err as Error).message }
    }
  })

  // Get current relay status
  ipcMain.handle(IPC_CHANNELS.REMOTE_STATUS, async () => {
    try {
      return { data: RelayManager.getStatus() }
    } catch (err) {
      log.error('[IPC] remote:status error:', err)
      return { error: (err as Error).message }
    }
  })

  // Test relay server connectivity
  ipcMain.handle(IPC_CHANNELS.REMOTE_TEST, async (_event, relayUrl: string) => {
    try {
      const result = await RelayManager.test(relayUrl)
      return { data: result }
    } catch (err) {
      log.error('[IPC] remote:test error:', err)
      return { error: (err as Error).message }
    }
  })

  // Regenerate device pairing code (invalidates old code)
  ipcMain.handle(IPC_CHANNELS.REMOTE_REGENERATE, async () => {
    try {
      const deviceCode = await RelayManager.regenerate()
      return { data: { deviceCode } }
    } catch (err) {
      log.error('[IPC] remote:regenerate error:', err)
      return { error: (err as Error).message }
    }
  })

  // Push relay status changes to renderer
  RelayManager.onStatusChange((status) => {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.REMOTE_STATUS_PUSH, status)
      }
    }
  })
}
