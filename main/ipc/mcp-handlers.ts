import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { getAllSettings, updateSettings } from '../storage/settings'
import type { McpServerConfig } from '../../shared/types/settings'
import log from 'electron-log'

export function registerMcpHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.MCP_LIST, async () => {
    try {
      const settings = getAllSettings()
      const servers = Object.entries(settings.mcpServers).map(([name, config]) => ({
        name,
        config,
        enabled: true,
        connected: false, // Connection status tracked at runtime
      }))
      return { data: servers }
    } catch (err) {
      log.error('[IPC] mcp:list error:', err)
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.MCP_ADD,
    async (_event, { name, config }: { name: string; config: McpServerConfig }) => {
      try {
        const settings = getAllSettings()
        const updatedServers = { ...settings.mcpServers, [name]: config }
        updateSettings({ mcpServers: updatedServers })
        return { data: null }
      } catch (err) {
        log.error('[IPC] mcp:add error:', err)
        return { error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.MCP_REMOVE, async (_event, { name }: { name: string }) => {
    try {
      const settings = getAllSettings()
      const updatedServers = { ...settings.mcpServers }
      delete updatedServers[name]
      updateSettings({ mcpServers: updatedServers })
      return { data: null }
    } catch (err) {
      log.error('[IPC] mcp:remove error:', err)
      return { error: (err as Error).message }
    }
  })

  // Reconnect is a no-op for now — MCP servers reconnect on each agent session
  ipcMain.handle(IPC_CHANNELS.MCP_RECONNECT, async (_event, { name }: { name: string }) => {
    log.info(`[IPC] mcp:reconnect requested for: ${name}`)
    return { data: null }
  })
}
