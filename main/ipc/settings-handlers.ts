import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { getAllSettings, updateSettings, getSetting } from '../storage/settings'
import type { AppSettings, RemoteControlConfig } from '../../shared/types/settings'
import { relayClient } from '../remote-control/ws-client'
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
        if ('remoteControl' in partial) {
          const newConfig = getSetting('remoteControl') as RemoteControlConfig
          if (newConfig.enabled && newConfig.serverUrl && newConfig.pairingKey) {
            relayClient.restart(newConfig)
          } else {
            relayClient.stop()
          }
        }
        return { data: null }
      } catch (err) {
        log.error('[IPC] settings:set error:', err)
        return { error: (err as Error).message }
      }
    }
  )
}
