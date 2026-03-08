import React, { useEffect, useState } from 'react'
import { ConnectScreen } from './components/connect/ConnectScreen'
import { MobileHeader } from './components/layout/MobileHeader'
import { ConversationDrawer } from './components/layout/ConversationDrawer'
import { MobileChatView } from './components/chat/MobileChatView'
import { UIBottomSheet } from './components/ui-overlay/UIBottomSheet'
import { MobileSettings } from './components/settings/MobileSettings'
import { ConnectionStatusBar } from './components/layout/ConnectionStatusBar'
import { useConnectionStore } from './api/connection-store'
import { useConversationStore } from './store/conversation-store'
import { useSettingsStore } from './store/settings-store'
import { useAgentStreamSubscription } from './hooks/useAgent'
import { useConnectionMonitor } from './hooks/useConnection'

function ChatApp() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { loadConversations } = useConversationStore()
  const { load: loadSettings } = useSettingsStore()

  // Subscribe to agent stream events
  useAgentStreamSubscription()

  // Listen for title updates
  useEffect(() => {
    const cleanup = window.electronAPI.conversations.onTitleUpdated(({ conversationId, title }) => {
      useConversationStore.getState().updateConversationTitle(conversationId, title)
    })
    return cleanup
  }, [])

  // Load initial data from desktop
  useEffect(() => {
    loadSettings()
    loadConversations().then(() => {
      const { conversations, createConversation } = useConversationStore.getState()
      if (conversations.length === 0) {
        createConversation('New Conversation')
      } else {
        // Select the most recent conversation
        useConversationStore.getState().selectConversation(conversations[0].id)
      }
    })
  }, [])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      <ConnectionStatusBar />
      <MobileHeader onOpenDrawer={() => setDrawerOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
      <div className="flex-1 min-h-0">
        <MobileChatView />
      </div>
      <ConversationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <UIBottomSheet />
      <MobileSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default function App() {
  const { status, tryAutoConnect } = useConnectionStore()
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false)

  // Monitor WebSocket state at the top level so it keeps running
  // even when ChatApp is not rendered (e.g. during reconnection).
  useConnectionMonitor()

  // On mount, check for ?token= URL parameter or persisted session and auto-connect
  useEffect(() => {
    if (!autoConnectAttempted) {
      tryAutoConnect()
      setAutoConnectAttempted(true)
    }
  }, [])

  // Show ConnectScreen only when truly disconnected (user hasn't connected yet or explicitly disconnected).
  // During temporary connection drops ('connecting' with a known deviceCode) we keep showing ChatApp
  // so the user isn't kicked back to the code-entry screen.
  // IMPORTANT: only keep ChatApp if we have connected at least once this page session,
  // because window.electronAPI is only installed after a successful connect.
  const hasConnectedOnce = useConnectionStore((s) => s.hasConnectedOnce)

  if (status === 'connected') {
    return <ChatApp />
  }

  // If we have successfully connected before in this page session, keep ChatApp rendered
  // while reconnecting — the ConnectionStatusBar will show the reconnection banner.
  if (hasConnectedOnce && (status === 'connecting' || status === 'error')) {
    return <ChatApp />
  }

  return <ConnectScreen />
}
