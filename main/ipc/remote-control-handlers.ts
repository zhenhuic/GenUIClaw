import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import log from 'electron-log'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { getSetting, setSetting } from '../storage/settings'
import { relayClient } from '../remote-control/ws-client'
import type { RemoteControlConfig } from '../../shared/types/settings'

export function registerRemoteControlHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.REMOTE_CONTROL_GET_STATUS, async () => {
    try {
      return { data: relayClient.getStatus() }
    } catch (err) {
      log.error('[IPC] remote-control:get-status error:', err)
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.REMOTE_CONTROL_REGEN_KEY, async () => {
    try {
      const newKey = randomUUID()
      const current = getSetting('remoteControl') as RemoteControlConfig
      const updated: RemoteControlConfig = { ...current, pairingKey: newKey }
      setSetting('remoteControl', updated)

      if (updated.enabled && updated.serverUrl) {
        relayClient.restart(updated)
      }

      return { data: { pairingKey: newKey } }
    } catch (err) {
      log.error('[IPC] remote-control:regen-key error:', err)
      return { error: (err as Error).message }
    }
  })
}
