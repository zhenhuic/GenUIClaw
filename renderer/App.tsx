import React, { useEffect, useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { MainContent } from './components/layout/MainContent'
import { TitleBar } from './components/layout/TitleBar'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { useConversationStore } from './store/conversation-store'
import { useSettingsStore } from './store/settings-store'
import { useAgentStreamSubscription } from './hooks/useAgent'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const { loadConversations } = useConversationStore()
  const { load: loadSettings, settings } = useSettingsStore()

  useAgentStreamSubscription()

  useEffect(() => {
    const cleanup = window.electronAPI.conversations.onTitleUpdated(({ conversationId, title }) => {
      useConversationStore.getState().updateConversationTitle(conversationId, title)
    })
    return cleanup
  }, [])

  // Refresh conversation list when remote client creates/deletes conversations
  useEffect(() => {
    const cleanup = window.electronAPI.conversations.onChanged(() => {
      useConversationStore.getState().loadConversations()
    })
    return cleanup
  }, [])

  // Apply theme on load
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'dark') {
      root.classList.remove('light')
    } else if (settings.theme === 'light') {
      root.classList.add('light')
    } else {
      // System
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (!isDark) root.classList.add('light')
    }
  }, [settings.theme])

  useEffect(() => {
    loadSettings()
    loadConversations().then(() => {
      const { createConversation } = useConversationStore.getState()
      // 应用打开后默认新建一个会话并选中
      createConversation('New Conversation')
    })
  }, [])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      <TitleBar onSettings={() => setShowSettings(true)} />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <MainContent />
      </div>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}
