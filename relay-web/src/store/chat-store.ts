import { create } from 'zustand'
import { randomUUID } from '../utils'
import type { AppMessage, IpcAgentEvent, MessageContentBlock } from '../types'

interface ChatState {
  messages: AppMessage[]
  isRunning: boolean
  activeSessionId: string | null
  activeRemoteSessionId: string | null

  addUserMessage: (text: string) => void
  handleAgentEvent: (event: IpcAgentEvent) => void
  setActiveRemoteSessionId: (id: string | null) => void
  setMessages: (messages: AppMessage[]) => void
  clear: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isRunning: false,
  activeSessionId: null,
  activeRemoteSessionId: null,

  addUserMessage: (text) => {
    const msg: AppMessage = {
      id: randomUUID(),
      role: 'user',
      content: [{ type: 'text', text }],
      createdAt: Date.now(),
    }
    set((s) => ({ messages: [...s.messages, msg] }))
  },

  handleAgentEvent: (event) => {
    console.log('[ChatStore] handleAgentEvent type=', event.type)
    set((state) => {
      switch (event.type) {
        case 'session_start': {
          console.log('[ChatStore] session_start sessionId=', event.sessionId, 'current msgs=', state.messages.length)
          const emptyMsg: AppMessage = {
            id: randomUUID(),
            role: 'assistant',
            content: [],
            sessionId: event.sessionId,
            createdAt: Date.now(),
          }
          return {
            messages: [...state.messages, emptyMsg],
            isRunning: true,
            activeSessionId: event.sessionId,
          }
        }

        case 'text_delta': {
          const msgs = [...state.messages]
          const lastIdx = msgs.findLastIndex((m) => m.role === 'assistant' && m.sessionId === event.sessionId)
          if (lastIdx === -1) {
            console.warn('[ChatStore] text_delta: no assistant msg for sessionId=', event.sessionId, 'msgs=', msgs.map(m => `${m.role}(${m.sessionId})`))
            return {}
          }
          const last = { ...msgs[lastIdx], content: [...msgs[lastIdx].content] }
          const lastBlock = last.content[last.content.length - 1]
          if (lastBlock?.type === 'text') {
            last.content[last.content.length - 1] = { type: 'text', text: lastBlock.text + event.text }
          } else {
            last.content.push({ type: 'text', text: event.text })
          }
          msgs[lastIdx] = last
          return { messages: msgs }
        }

        case 'tool_call_start': {
          const msgs = [...state.messages]
          const lastIdx = msgs.findLastIndex((m) => m.role === 'assistant' && m.sessionId === event.sessionId)
          if (lastIdx === -1) return {}
          const last = { ...msgs[lastIdx], content: [...msgs[lastIdx].content] }
          const block: MessageContentBlock = {
            type: 'tool_call',
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            input: event.input,
            status: 'pending',
          }
          last.content.push(block)
          msgs[lastIdx] = last
          return { messages: msgs }
        }

        case 'tool_call_result': {
          const msgs = state.messages.map((m) => {
            if (m.role !== 'assistant') return m
            const content = m.content.map((b) => {
              if (b.type === 'tool_call' && b.toolCallId === event.toolCallId) {
                return {
                  ...b,
                  status: (event.isError ? 'error' : 'done') as 'done' | 'error',
                  output: event.output,
                  isError: event.isError,
                }
              }
              return b
            })
            return { ...m, content }
          })
          return { messages: msgs }
        }

        case 'ui_render': {
          const msgs = [...state.messages]
          const lastIdx = msgs.findLastIndex((m) => m.role === 'assistant' && m.sessionId === event.sessionId)
          if (lastIdx === -1) return {}
          const last = { ...msgs[lastIdx], content: [...msgs[lastIdx].content] }
          last.content.push({ type: 'ui_render', renderBlockId: event.renderBlockId, schema: event.schema })
          msgs[lastIdx] = last
          return { messages: msgs }
        }

        case 'session_end': {
          return { isRunning: false, activeSessionId: null }
        }

        default:
          return {}
      }
    })
  },

  setActiveRemoteSessionId: (id) => set({ activeRemoteSessionId: id }),

  setMessages: (messages) => set({ messages }),

  clear: () => set({ messages: [], isRunning: false, activeSessionId: null, activeRemoteSessionId: null }),
}))
