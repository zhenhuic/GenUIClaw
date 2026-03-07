/**
 * Agent hook for mobile — same logic as desktop renderer/hooks/useAgent.ts,
 * but uses local mobile stores and window.electronAPI provided by remote-api.
 */

import { useEffect, useCallback } from 'react'
import { useAgentStore } from '../store/agent-store'
import { useConversationStore } from '../store/conversation-store'
import { useSettingsStore } from '../store/settings-store'
import type { AgentStartPayload } from '@shared/types/ipc'
import { generateUUID } from '../utils/uuid'

export function useAgentStreamSubscription() {
  const handleAgentEvent = useConversationStore((s) => s.handleAgentEvent)
  const setRunning = useAgentStore((s) => s.setRunning)
  const setIdle = useAgentStore((s) => s.setIdle)

  useEffect(() => {
    const cleanup = window.electronAPI.agent.onStreamEvent((event) => {
      if (event.type === 'ui_action_received') {
        const { renderBlockId, actionId, data } = event
        const { activeConversationId } = useConversationStore.getState()
        const { settings } = useSettingsStore.getState()
        const { selectedModelId, selectedSkillIds } = useAgentStore.getState()

        if (activeConversationId) {
          const sessionId = generateUUID()
          window.electronAPI.agent.uiAction({
            sessionId,
            conversationId: activeConversationId,
            renderBlockId,
            actionId,
            data,
            agentContext: {
              allowedTools: settings.allowedTools,
              mcpServers: settings.mcpServers,
              cwd: settings.defaultCwd || undefined,
              systemPrompt: settings.systemPrompt || undefined,
              modelId: selectedModelId || undefined,
              skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
            },
          })
        }
        return
      }

      handleAgentEvent(event)
      if (event.type === 'session_start') {
        setRunning(event.sessionId)
      }
      if (event.type === 'session_end') {
        setIdle()
      }
    })
    return cleanup
  }, [handleAgentEvent, setRunning, setIdle])
}

export function useAgent() {
  const { isRunning, activeSessionId, selectedModelId, selectedSkillIds } = useAgentStore()
  const { activeConversationId, addUserMessage, createConversation } =
    useConversationStore()
  const { settings } = useSettingsStore()

  const sendMessage = useCallback(
    async (text: string) => {
      if (isRunning) return

      let conversationId = activeConversationId
      if (!conversationId) {
        const conv = await createConversation(text.slice(0, 50))
        conversationId = conv.id
      }

      const sessionId = generateUUID()
      addUserMessage(text, sessionId)

      const payload: AgentStartPayload = {
        sessionId,
        prompt: text,
        conversationId,
        allowedTools: settings.allowedTools,
        mcpServers: settings.mcpServers,
        cwd: settings.defaultCwd || undefined,
        systemPrompt: settings.systemPrompt || undefined,
        modelId: selectedModelId || undefined,
        skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
      }

      await window.electronAPI.agent.start(payload)
    },
    [isRunning, activeConversationId, settings, addUserMessage, createConversation, selectedModelId, selectedSkillIds]
  )

  const interrupt = useCallback(() => {
    if (activeSessionId) {
      window.electronAPI.agent.interrupt({ sessionId: activeSessionId })
    }
  }, [activeSessionId])

  const sendUIAction = useCallback(
    async (renderBlockId: string, actionId: string, data: Record<string, unknown>) => {
      if (!activeConversationId) return

      await window.electronAPI.agent.uiAction({
        sessionId: generateUUID(),
        conversationId: activeConversationId,
        renderBlockId,
        actionId,
        data,
        agentContext: {
          allowedTools: settings.allowedTools,
          mcpServers: settings.mcpServers,
          cwd: settings.defaultCwd || undefined,
          systemPrompt: settings.systemPrompt || undefined,
          modelId: selectedModelId || undefined,
          skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
        },
      })
    },
    [activeConversationId, settings, selectedModelId, selectedSkillIds]
  )

  return { sendMessage, interrupt, sendUIAction, isRunning }
}
