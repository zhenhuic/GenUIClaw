import { Agent } from '@mariozechner/pi-agent-core'
import type { AgentEvent } from '@mariozechner/pi-agent-core'
import type { BrowserWindow } from 'electron'
import log from 'electron-log'
import { getSetting } from '../storage/settings'
import { updateConversationTitle } from '../storage/conversations'
import { getMessages } from '../storage/messages'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import type { ModelConfig } from '../../shared/types/settings'

function resolveModelForTitle(config: ModelConfig) {
  const api = config.apiProtocol === 'anthropic' ? 'anthropic' : 'openai-completions'
  return {
    id: config.name,
    name: config.name,
    api,
    provider: config.apiProtocol,
    baseUrl: config.baseUrl,
    reasoning: false,
    input: ['text'] as const,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200000,
    maxTokens: 256,
  }
}

const titledConversations = new Set<string>()

export async function generateConversationTitle(
  conversationId: string,
  modelId: string | undefined,
  mainWindow: BrowserWindow | null
): Promise<void> {
  if (titledConversations.has(conversationId)) return
  titledConversations.add(conversationId)

  try {
    const messages = getMessages(conversationId)
    const userMessages = messages.filter((m) => m.role === 'user')
    const assistantMessages = messages.filter((m) => m.role === 'assistant')

    if (userMessages.length === 0 || assistantMessages.length === 0) return

    const userText = userMessages[0].content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join(' ')
      .slice(0, 500)

    const assistantText = assistantMessages[0].content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join(' ')
      .slice(0, 500)

    if (!userText.trim()) return

    const models = getSetting('models') as ModelConfig[]
    const selectedModel = modelId
      ? models.find((m) => m.id === modelId)
      : models.find((m) => m.enabled)

    if (!selectedModel) return

    const resolvedModel = resolveModelForTitle(selectedModel)

    const agent = new Agent({
      initialState: {
        systemPrompt:
          'You are a title generator. Given a conversation between a user and an assistant, generate a very short title (3-8 words) that summarizes the topic. Respond with ONLY the title, no quotes, no explanation.',
        model: resolvedModel as any,
        tools: [],
      },
      getApiKey: async () => selectedModel.apiKey || undefined,
    })

    let title = ''

    const eventPromise = new Promise<void>((resolve) => {
      const unsubscribe = agent.subscribe((event: AgentEvent) => {
        if (event.type === 'message_update') {
          const streamEvent = event.assistantMessageEvent as any
          if (streamEvent.type === 'text_delta') {
            title += streamEvent.delta
          }
        }
        if (event.type === 'agent_end') {
          unsubscribe()
          resolve()
        }
      })
    })

    await agent.prompt(
      `User: ${userText}\n\nAssistant: ${assistantText}\n\nGenerate a concise title for this conversation.`
    )
    await eventPromise

    title = title.trim().replace(/^["']|["']$/g, '').slice(0, 80)

    if (title) {
      updateConversationTitle(conversationId, title)
      log.info(`[TitleGen] Conversation ${conversationId} titled: "${title}"`)

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.CONVERSATION_TITLE_UPDATED, {
          conversationId,
          title,
        })
      }
    }
  } catch (err) {
    log.warn(`[TitleGen] Failed to generate title for ${conversationId}:`, err)
    titledConversations.delete(conversationId)
  }
}
