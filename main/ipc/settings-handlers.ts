import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { getAllSettings, updateSettings } from '../storage/settings'
import type { AppSettings } from '../../shared/types/settings'
import log from 'electron-log'

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    try {
      return { data: getAllSettings() }
    } catch (err) {
      log.error('[IPC] settings:get error:', err)
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET,
    async (_event, partial: Partial<AppSettings>) => {
      try {
        updateSettings(partial)
        return { data: null }
      } catch (err) {
        log.error('[IPC] settings:set error:', err)
        return { error: (err as Error).message }
      }
    }
  )
}
