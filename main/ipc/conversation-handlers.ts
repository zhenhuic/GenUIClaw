import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import {
  listConversations,
  getConversation,
  createConversation,
  deleteConversation,
} from '../storage/conversations'
import { getMessages } from '../storage/messages'
import log from 'electron-log'

export function registerConversationHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.CONVERSATION_LIST, async () => {
    try {
      return { data: listConversations() }
    } catch (err) {
      log.error('[IPC] conversation:list error:', err)
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CONVERSATION_GET, async (_event, { id }: { id: string }) => {
    try {
      const conv = getConversation(id)
      if (!conv) return { error: 'Conversation not found' }
      return { data: conv }
    } catch (err) {
      log.error('[IPC] conversation:get error:', err)
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.CONVERSATION_CREATE,
    async (_event, { title }: { title: string }) => {
      try {
        return { data: createConversation(title) }
      } catch (err) {
        log.error('[IPC] conversation:create error:', err)
        return { error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.CONVERSATION_DELETE, async (_event, { id }: { id: string }) => {
    try {
      deleteConversation(id)
      return { data: null }
    } catch (err) {
      log.error('[IPC] conversation:delete error:', err)
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.MESSAGES_GET,
    async (_event, { conversationId }: { conversationId: string }) => {
      try {
        return { data: getMessages(conversationId) }
      } catch (err) {
        log.error('[IPC] messages:get error:', err)
        return { error: (err as Error).message }
      }
    }
  )
}
