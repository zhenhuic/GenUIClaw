import { create } from 'zustand'
import type { AppMessage, MessageContentBlock, ToolCallBlock } from '../../shared/types/conversation'
import type { Conversation } from '../../shared/types/conversation'
import type { IpcAgentEvent } from '../../shared/types/ipc'

interface ConversationState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: AppMessage[]

  // Conversation list management
  loadConversations: () => Promise<void>
  selectConversation: (id: string) => Promise<void>
  createConversation: (title?: string) => Promise<Conversation>
  deleteConversation: (id: string) => Promise<void>

  // Message management
  addUserMessage: (text: string, sessionId: string) => AppMessage
  handleAgentEvent: (event: IpcAgentEvent) => void
  clearMessages: () => void

  // Title management
  updateConversationTitle: (conversationId: string, title: string) => void
}

function makeAssistantMessage(sessionId: string): AppMessage {
  return {
    id: crypto.randomUUID(),
    conversationId: '',
    role: 'assistant',
    content: [],
    sessionId,
    createdAt: Date.now(),
  }
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],

  loadConversations: async () => {
    const result = await window.electronAPI.conversations.list()
    if (result && 'data' in result && result.data) {
      set({ conversations: result.data as Conversation[] })
    }
  },

  selectConversation: async (id) => {
    set({ activeConversationId: id, messages: [] })
    const result = await window.electronAPI.conversations.getMessages(id)
    if (result && 'data' in result && result.data) {
      set({ messages: result.data as AppMessage[] })
    }
  },

  createConversation: async (title = 'New Conversation') => {
    const result = await window.electronAPI.conversations.create(title)
    const conv = (result as { data: Conversation }).data
    set((state) => ({
      conversations: [conv, ...state.conversations],
      activeConversationId: conv.id,
      messages: [],
    }))
    return conv
  },

  deleteConversation: async (id) => {
    await window.electronAPI.conversations.delete(id)
    set((state) => {
      const conversations = state.conversations.filter((c) => c.id !== id)
      const activeConversationId =
        state.activeConversationId === id
          ? (conversations[0]?.id ?? null)
          : state.activeConversationId
      return {
        conversations,
        activeConversationId,
        messages: state.activeConversationId === id ? [] : state.messages,
      }
    })
  },

  addUserMessage: (text, sessionId) => {
    const message: AppMessage = {
      id: crypto.randomUUID(),
      conversationId: get().activeConversationId ?? '',
      role: 'user',
      content: [{ type: 'text', text }],
      sessionId,
      createdAt: Date.now(),
    }
    set((state) => ({ messages: [...state.messages, message] }))
    return message
  },

  handleAgentEvent: (event) => {
    set((state) => {
      const messages = [...state.messages]

      switch (event.type) {
        case 'session_start': {
          // Add empty assistant message that will be filled in
          const assistantMsg = makeAssistantMessage(event.sessionId)
          return { messages: [...messages, assistantMsg] }
        }

        case 'text_delta': {
          // Append text to the last assistant message
          const lastIdx = findLastAssistantIdx(messages, event.sessionId)
          if (lastIdx === -1) return state
          const updated = [...messages]
          const msg = { ...updated[lastIdx], content: [...updated[lastIdx].content] }
          const lastBlock = msg.content[msg.content.length - 1]
          if (lastBlock?.type === 'text') {
            msg.content[msg.content.length - 1] = {
              type: 'text',
              text: lastBlock.text + event.text,
            }
          } else {
            msg.content.push({ type: 'text', text: event.text })
          }
          updated[lastIdx] = msg
          return { messages: updated }
        }

        case 'tool_call_start': {
          const lastIdx = findLastAssistantIdx(messages, event.sessionId)
          if (lastIdx === -1) return state
          const updated = [...messages]
          const msg = { ...updated[lastIdx], content: [...updated[lastIdx].content] }
          const toolBlock: ToolCallBlock = {
            type: 'tool_call',
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            input: event.input,
            status: 'pending',
          }
          msg.content.push(toolBlock)
          updated[lastIdx] = msg
          return { messages: updated }
        }

        case 'tool_call_result': {
          const lastIdx = findLastAssistantIdx(messages, event.sessionId)
          if (lastIdx === -1) return state
          const updated = [...messages]
          const msg = { ...updated[lastIdx], content: [...updated[lastIdx].content] }
          const toolIdx = msg.content.findIndex(
            (b): b is ToolCallBlock =>
              b.type === 'tool_call' && b.toolCallId === event.toolCallId
          )
          if (toolIdx !== -1) {
            msg.content[toolIdx] = {
              ...(msg.content[toolIdx] as ToolCallBlock),
              status: event.isError ? 'error' : 'done',
              output: event.output,
              isError: event.isError,
            }
          }
          updated[lastIdx] = msg
          return { messages: updated }
        }

        case 'ui_render': {
          const lastIdx = findLastAssistantIdx(messages, event.sessionId)
          if (lastIdx === -1) return state
          const updated = [...messages]
          const msg = { ...updated[lastIdx], content: [...updated[lastIdx].content] }
          msg.content.push({
            type: 'ui_render',
            renderBlockId: event.renderBlockId,
            schema: event.schema,
          })
          updated[lastIdx] = msg
          return { messages: updated }
        }

        default:
          return state
      }
    })
  },

  clearMessages: () => set({ messages: [] }),

  updateConversationTitle: (conversationId, title) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, title } : c
      ),
    }))
  },
}))

function findLastAssistantIdx(messages: AppMessage[], sessionId: string): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant' && messages[i].sessionId === sessionId) {
      return i
    }
  }
  return -1
}
