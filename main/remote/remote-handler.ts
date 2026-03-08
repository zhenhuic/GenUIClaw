/**
 * Remote request handler.
 *
 * Routes incoming requests from the mobile client (forwarded by the relay server)
 * to the local Agent engine and storage layer. This is the "server-side" handler
 * that mirrors what ipc/*-handlers.ts do for the Electron renderer.
 */

import log from 'electron-log'
import type { RelayRequest, RelayResponse } from '../../shared/types/relay-protocol'
import type { TransportSender } from './transport'
import type { AgentStartPayload, UIActionPayload } from '../../shared/types/ipc'
import type { AppSettings } from '../../shared/types/settings'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'

// Storage
import {
  listConversations,
  getConversation,
  createConversation,
  deleteConversation,
} from '../storage/conversations'
import { getMessages, saveMessage } from '../storage/messages'
import { getAllSettings, updateSettings } from '../storage/settings'
import { listAllSkills, toggleSkillEnabled } from '../storage/skills'

// Agent
import { runAgentSession, serializeUIAction } from '../agent/runner'
import { AbortRegistry } from '../agent/abort-controller'
import { generateConversationTitle } from '../agent/title-generator'

/**
 * Handle a single request from the mobile client.
 *
 * @param req        The parsed relay request
 * @param sender     A TransportSender that pushes events back to the mobile client
 * @param titleSenders  Senders that should receive title-updated notifications
 *                      (includes both local Electron window and remote mobile)
 */
export async function handleRemoteRequest(
  req: RelayRequest,
  sender: TransportSender,
  titleSenders: TransportSender[]
): Promise<RelayResponse> {
  const params = (req.params ?? {}) as Record<string, unknown>

  try {
    switch (req.method) {
      // ---- Agent ----

      case 'agent.start': {
        const p = params as unknown as AgentStartPayload
        try {
          saveMessage(p.conversationId, 'user', [{ type: 'text', text: p.prompt }], p.sessionId)
        } catch (err) {
          log.error('[Remote] Failed to save user message:', err)
        }

        setImmediate(async () => {
          await runAgentSession({
            sessionId: p.sessionId,
            prompt: p.prompt,
            conversationId: p.conversationId,
            allowedTools: p.allowedTools,
            mcpServers: p.mcpServers,
            cwd: p.cwd,
            systemPrompt: p.systemPrompt,
            sender,
            modelId: p.modelId,
            skillIds: p.skillIds,
          })
          generateConversationTitle(p.conversationId, p.modelId, titleSenders)
        })

        return { type: 'response', id: req.id, result: { sessionId: p.sessionId, status: 'started' } }
      }

      case 'agent.interrupt': {
        const sessionId = params.sessionId as string
        const interrupted = AbortRegistry.interrupt(sessionId)
        return { type: 'response', id: req.id, result: { status: interrupted ? 'interrupted' : 'not_found' } }
      }

      case 'agent.uiAction': {
        const p = params as unknown as UIActionPayload
        const prompt = serializeUIAction(p.actionId, p.data, p.renderBlockId)

        setImmediate(() =>
          runAgentSession({
            sessionId: p.sessionId,
            prompt,
            conversationId: p.conversationId,
            allowedTools: p.agentContext.allowedTools,
            mcpServers: p.agentContext.mcpServers,
            cwd: p.agentContext.cwd,
            systemPrompt: p.agentContext.systemPrompt,
            sender,
            modelId: p.agentContext.modelId,
            skillIds: p.agentContext.skillIds,
          })
        )

        return { type: 'response', id: req.id, result: { status: 'processing' } }
      }

      // ---- Conversations ----

      case 'conversations.list': {
        return { type: 'response', id: req.id, result: { data: listConversations() } }
      }

      case 'conversations.get': {
        const conv = getConversation(params.id as string)
        if (!conv) return { type: 'response', id: req.id, result: { error: 'Conversation not found' } }
        return { type: 'response', id: req.id, result: { data: conv } }
      }

      case 'conversations.create': {
        const conv = createConversation(params.title as string, 'remote')
        // Notify desktop renderer to refresh conversation list
        notifyDesktopConversationChanged(titleSenders)
        return { type: 'response', id: req.id, result: { data: conv } }
      }

      case 'conversations.delete': {
        deleteConversation(params.id as string)
        // Notify desktop renderer to refresh conversation list
        notifyDesktopConversationChanged(titleSenders)
        return { type: 'response', id: req.id, result: { data: null } }
      }

      case 'conversations.getMessages': {
        const msgs = getMessages(params.conversationId as string)
        return { type: 'response', id: req.id, result: { data: msgs } }
      }

      // ---- Settings ----

      case 'settings.get': {
        const settings = getAllSettings()
        // SECURITY: Strip API keys — mobile client must never see them
        const safeSettings: AppSettings = {
          ...settings,
          models: settings.models.map((m) => ({ ...m, apiKey: '***' })),
        }
        return { type: 'response', id: req.id, result: { data: safeSettings } }
      }

      case 'settings.set': {
        // Prevent mobile from setting sensitive fields
        const partial = params as Partial<AppSettings>
        delete (partial as any).models // Cannot change models remotely
        updateSettings(partial)
        return { type: 'response', id: req.id, result: { data: null } }
      }

      // ---- Skills ----

      case 'skills.list': {
        return { type: 'response', id: req.id, result: { data: listAllSkills() } }
      }

      case 'skills.toggle': {
        const enabled = toggleSkillEnabled(params.id as string)
        return { type: 'response', id: req.id, result: { data: { enabled } } }
      }

      // ---- MCP ----

      case 'mcp.list': {
        const settings = getAllSettings()
        const servers = Object.entries(settings.mcpServers).map(([name, config]) => ({
          name,
          config,
          enabled: true,
          connected: false,
        }))
        return { type: 'response', id: req.id, result: { data: servers } }
      }

      // ---- Default ----

      default:
        return { type: 'response', id: req.id, error: `Unknown method: ${req.method}` }
    }
  } catch (err) {
    log.error(`[Remote] Error handling ${req.method}:`, err)
    return { type: 'response', id: req.id, error: (err as Error).message }
  }
}

/** Notify desktop senders that the conversation list has changed. */
function notifyDesktopConversationChanged(senders: TransportSender[]): void {
  for (const s of senders) {
    if (!s.isDestroyed()) {
      s.send(IPC_CHANNELS.CONVERSATION_CHANGED, {})
    }
  }
}
