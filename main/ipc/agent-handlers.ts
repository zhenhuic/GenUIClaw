import { ipcMain, BrowserWindow } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import log from 'electron-log'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import type { AgentStartPayload, AgentInterruptPayload, UIActionPayload } from '../../shared/types/ipc'
import { runAgentSession, serializeUIAction } from '../agent/runner'
import { AbortRegistry } from '../agent/abort-controller'
import { validateSender } from '../security/sender-validator'
import { saveMessage } from '../storage/messages'
import { generateConversationTitle } from '../agent/title-generator'
import { ElectronTransportSender } from '../remote/transport'
import type { TransportSender } from '../remote/transport'

export function registerAgentHandlers(): void {
  // Start a new agent session — non-blocking, responses stream via AGENT_STREAM_EVENT
  ipcMain.handle(
    IPC_CHANNELS.AGENT_START,
    async (event: IpcMainInvokeEvent, payload: AgentStartPayload) => {
      if (!validateSender(event.senderFrame)) {
        return { error: 'Unauthorized sender' }
      }

      const { sessionId, prompt, conversationId, allowedTools, mcpServers, cwd, systemPrompt, modelId, skillIds } =
        payload

      try {
        saveMessage(conversationId, 'user', [{ type: 'text', text: prompt }], sessionId)
      } catch (err) {
        log.error('[IPC] Failed to save user message:', err)
      }

      const mainWindow = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed())

      const senderTransport = new ElectronTransportSender(event.sender)

      setImmediate(async () => {
        try {
          await runAgentSession({
            sessionId,
            prompt,
            conversationId,
            allowedTools,
            mcpServers,
            cwd,
            systemPrompt,
            sender: senderTransport,
            modelId,
            skillIds,
          })

          const titleSenders: TransportSender[] = []
          if (mainWindow && !mainWindow.isDestroyed()) {
            titleSenders.push(new ElectronTransportSender(mainWindow.webContents))
          }
          generateConversationTitle(conversationId, modelId, titleSenders)
        } catch (err) {
          log.error('[IPC] Agent session failed:', err)
        }
      })

      return { data: { sessionId, status: 'started' } }
    }
  )

  // Interrupt a running agent session
  ipcMain.handle(
    IPC_CHANNELS.AGENT_INTERRUPT,
    async (event: IpcMainInvokeEvent, payload: AgentInterruptPayload) => {
      if (!validateSender(event.senderFrame)) {
        return { error: 'Unauthorized sender' }
      }

      const interrupted = AbortRegistry.interrupt(payload.sessionId)
      return { data: { status: interrupted ? 'interrupted' : 'not_found' } }
    }
  )

  // Handle generative UI action callback — user clicked button/submitted form
  ipcMain.handle(
    IPC_CHANNELS.UI_ACTION,
    async (event: IpcMainInvokeEvent, payload: UIActionPayload) => {
      if (!validateSender(event.senderFrame)) {
        return { error: 'Unauthorized sender' }
      }

      const { sessionId, conversationId, renderBlockId, actionId, data, agentContext } = payload

      const prompt = serializeUIAction(actionId, data, renderBlockId)

      setImmediate(() =>
        runAgentSession({
          sessionId,
          prompt,
          conversationId,
          allowedTools: agentContext.allowedTools,
          mcpServers: agentContext.mcpServers,
          cwd: agentContext.cwd,
          systemPrompt: agentContext.systemPrompt,
          sender: new ElectronTransportSender(event.sender),
          modelId: agentContext.modelId,
          skillIds: agentContext.skillIds,
        }).catch((err) => {
          log.error('[IPC] UI action agent session failed:', err)
        })
      )

      return { data: { status: 'processing' } }
    }
  )
}
