import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Send, Square, MessageSquare, Plus, Trash2, LogOut,
  ChevronDown, Sparkles, X, PanelLeft,
} from 'lucide-react'
import { useAuthStore } from '../store/auth-store'
import { useChatStore } from '../store/chat-store'
import { useRelayWS } from '../hooks/useRelayWS'
import { apiFetch } from '../utils'
import { MessageBubble } from '../components/chat/MessageBubble'
import { UITilePanel } from '../components/chat/UITilePanel'
import type { RemoteAgent, RemoteConversation, UISchema, AppMessage } from '../types'

interface UITile {
  renderBlockId: string
  title: string
  schema: UISchema
}

type UIBlockState = 'open' | 'minimized'

interface AgentConfig {
  models: Array<{ id: string; name: string }>
  skills: Array<{ id: string; name: string }>
}

export function ChatPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const { token, logout } = useAuthStore()
  const navigate = useNavigate()
  const {
    messages, isRunning, activeRemoteSessionId,
    addUserMessage, handleAgentEvent, setMessages, clear,
  } = useChatStore()

  const [agent, setAgent] = useState<RemoteAgent | null>(null)
  const [conversations, setConversations] = useState<RemoteConversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | undefined>()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [text, setText] = useState('')
  const [wsError, setWsError] = useState('')
  const [uiBlockStates, setUIBlockStates] = useState<Map<string, UIBlockState>>(new Map())
  const [uiTiles, setUITiles] = useState<UITile[]>([])

  // Model/skill selection
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({ models: [], skills: [] })
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>()
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false)
  const [showToolbar, setShowToolbar] = useState(false)
  const skillsDropdownRef = useRef<HTMLDivElement>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Detect mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Load agent info + config + conversations
  useEffect(() => {
    if (!token) { navigate('/login'); return }
    if (!agentId) return

    apiFetch<RemoteAgent[]>('/agents', undefined, token).then((agents) => {
      const found = agents.find((a) => a.id === agentId)
      setAgent(found ?? null)
    })

    apiFetch<AgentConfig>(`/agents/${agentId}/config`, undefined, token).then((cfg) => {
      setAgentConfig(cfg)
      if (cfg.models.length > 0) setSelectedModelId(cfg.models[0].id)
    }).catch(() => {/* config not available yet */})

    loadConversations()
  }, [agentId, token])

  const loadConversations = useCallback(async () => {
    if (!agentId || !token) return
    const convs = await apiFetch<RemoteConversation[]>(`/conversations?agentId=${agentId}`, undefined, token)
    setConversations(convs)
  }, [agentId, token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Click outside skills dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent | TouchEvent) {
      if (skillsDropdownRef.current && !skillsDropdownRef.current.contains(e.target as Node)) {
        setShowSkillsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [text])

  const selectConversation = async (convId: string) => {
    if (convId === activeConvId) return
    setActiveConvId(convId)
    clear()
    if (isMobile) setSidebarOpen(false)
    try {
      const msgs = await apiFetch<Array<{ id: string; role: string; content: AppMessage['content']; createdAt: number }>>(
        `/conversations/${convId}/messages`, undefined, token!
      )
      const appMsgs: AppMessage[] = msgs.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: m.createdAt,
      }))
      setMessages(appMsgs)
    } catch {/* ignore */}
  }

  const createNewConversation = async () => {
    if (!agentId || !token) return
    const conv = await apiFetch<RemoteConversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ agentId, title: 'New Conversation' }),
    }, token)
    setConversations((prev) => [conv, ...prev])
    setActiveConvId(conv.id)
    clear()
    if (isMobile) setSidebarOpen(false)
  }

  const deleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    setConversations((prev) => prev.filter((c) => c.id !== convId))
    if (activeConvId === convId) {
      setActiveConvId(undefined)
      clear()
    }
  }

  const handleSessionStarted = useCallback((_remoteSessionId: string, convId: string) => {
    setActiveConvId(convId)
    loadConversations()
  }, [loadConversations])

  const handleConversationCreated = useCallback((convId: string) => {
    setActiveConvId(convId)
    loadConversations()
  }, [loadConversations])

  const handleWsError = useCallback((msg: string) => setWsError(msg), [])

  const { sendMessage, interrupt, sendUIAction } = useRelayWS({
    token: token!,
    onSessionStarted: handleSessionStarted,
    onConversationCreated: handleConversationCreated,
    onError: handleWsError,
  })

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || isRunning || !agentId) return
    setText('')
    addUserMessage(trimmed)
    sendMessage(trimmed, agentId, activeConvId, selectedModelId, selectedSkillIds.length > 0 ? selectedSkillIds : undefined)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // On mobile, Enter should insert newline; only send via button
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((s) => s !== skillId) : [...prev, skillId]
    )
  }

  const handleMinimizeUI = useCallback((renderBlockId: string, title: string) => {
    let schema: UISchema | undefined
    for (const msg of messages) {
      for (const block of msg.content) {
        if (block.type === 'ui_render' && block.renderBlockId === renderBlockId) {
          schema = block.schema
        }
      }
    }
    if (!schema) return
    setUIBlockStates((prev) => new Map(prev).set(renderBlockId, 'minimized'))
    setUITiles((prev) => {
      if (prev.find((t) => t.renderBlockId === renderBlockId)) return prev
      return [...prev, { renderBlockId, title, schema: schema! }]
    })
  }, [messages])

  const handleRemoveTile = useCallback((renderBlockId: string) => {
    setUITiles((prev) => prev.filter((t) => t.renderBlockId !== renderBlockId))
    setUIBlockStates((prev) => { const next = new Map(prev); next.delete(renderBlockId); return next })
  }, [])

  const handleRestoreTile = useCallback((renderBlockId: string) => {
    setUIBlockStates((prev) => new Map(prev).set(renderBlockId, 'open'))
    setUITiles((prev) => prev.filter((t) => t.renderBlockId !== renderBlockId))
  }, [])

  const handleUIAction = useCallback((renderBlockId: string, actionId: string, data: Record<string, unknown>) => {
    if (!activeRemoteSessionId) return
    sendUIAction(activeRemoteSessionId, renderBlockId, actionId, data)
  }, [activeRemoteSessionId, sendUIAction])

  const displayMessages: AppMessage[] = messages.map((msg) => ({
    ...msg,
    content: msg.content.filter((block) => {
      if (block.type === 'ui_render') return uiBlockStates.get(block.renderBlockId) !== 'minimized'
      return true
    }),
  }))

  const selectedSkillNames = agentConfig.skills.filter((s) => selectedSkillIds.includes(s.id))
  const hasConfig = agentConfig.models.length > 0 || agentConfig.skills.length > 0

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#f9fafb', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
      }}>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          title="Toggle conversations"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6, minWidth: 36, minHeight: 36, justifyContent: 'center' }}
        >
          <PanelLeft size={18} />
        </button>
        <button
          onClick={createNewConversation}
          title="New conversation"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6, minWidth: 36, minHeight: 36, justifyContent: 'center' }}
        >
          <Plus size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {agent?.name ?? 'Agent'}
          </p>
          {isRunning && <p style={{ fontSize: 12, color: '#3b82f6', margin: '1px 0 0 0' }}>Thinking...</p>}
        </div>
        <button
          onClick={() => { logout(); navigate('/login') }}
          title="Sign out"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6, minWidth: 36, minHeight: 36, justifyContent: 'center' }}
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Error banner */}
      {wsError && (
        <div style={{ background: '#fef2f2', borderBottom: '1px solid #fca5a5', padding: '8px 12px', fontSize: 13, color: '#dc2626', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ flex: 1 }}>{wsError}</span>
          <button onClick={() => setWsError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18, padding: '0 4px', marginLeft: 8 }}>×</button>
        </div>
      )}

      {/* Body: sidebar + chat */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Sidebar overlay backdrop (mobile) */}
        {sidebarOpen && isMobile && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 10 }}
          />
        )}

        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: 240, flexShrink: 0, background: '#fff', borderRight: '1px solid #e5e7eb',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            // On mobile: absolute overlay
            ...(isMobile ? {
              position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 20,
              boxShadow: '2px 0 12px rgba(0,0,0,0.12)',
            } : {}),
          }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
              {conversations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 8px', color: '#9ca3af', fontSize: 13 }}>
                  No conversations yet
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                      padding: '10px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: conv.id === activeConvId ? '#eff6ff' : 'transparent',
                      color: conv.id === activeConvId ? '#1d4ed8' : '#374151',
                      marginBottom: 2, fontSize: 14, minHeight: 44,
                    }}
                  >
                    <MessageSquare size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.title}
                    </span>
                    <span
                      onClick={(e) => deleteConversation(e, conv.id)}
                      style={{ flexShrink: 0, color: '#9ca3af', display: 'flex', padding: 4 }}
                    >
                      <Trash2 size={12} />
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px 8px 0' : '16px 16px 0', WebkitOverflowScrolling: 'touch' }}>
            {displayMessages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 16px', color: '#9ca3af' }}>
                <p style={{ fontSize: 15, fontWeight: 500, margin: '0 0 8px' }}>Start a conversation</p>
                <p style={{ fontSize: 13 }}>Type a message to control your desktop agent remotely.</p>
              </div>
            )}
            {displayMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onUIAction={handleUIAction}
                onMinimizeUI={handleMinimizeUI}
              />
            ))}
            <div ref={messagesEndRef} style={{ height: 8 }} />
          </div>

          {/* Input area */}
          <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: isMobile ? '8px' : '12px', flexShrink: 0 }}>
            <div style={{
              maxWidth: 800, margin: '0 auto',
              border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'visible', background: '#fff',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Collapsible toolbar (model + skills) */}
              {hasConfig && showToolbar && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #f3f4f6', background: '#fafafa', flexWrap: 'wrap', borderRadius: '14px 14px 0 0' }}>
                  {agentConfig.models.length > 0 && (
                    <select
                      value={selectedModelId ?? ''}
                      onChange={(e) => setSelectedModelId(e.target.value || undefined)}
                      style={{ fontSize: 13, borderRadius: 6, padding: '4px 8px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', outline: 'none', cursor: 'pointer', flex: 1, minWidth: 0 }}
                    >
                      {agentConfig.models.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  )}

                  {/* Selected skill chips */}
                  {selectedSkillNames.map((skill) => (
                    <span
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12,
                        padding: '3px 8px', borderRadius: 99, cursor: 'pointer',
                        background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                      }}
                    >
                      <Sparkles size={10} /> {skill.name} <X size={10} />
                    </span>
                  ))}

                  {agentConfig.skills.length > 0 && (
                    <div style={{ position: 'relative' }} ref={skillsDropdownRef}>
                      <button
                        onClick={() => setShowSkillsDropdown((v) => !v)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12,
                          padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb',
                          background: '#fff', color: '#6b7280', cursor: 'pointer', minHeight: 32,
                        }}
                      >
                        <Sparkles size={11} /> Skills <ChevronDown size={10} />
                      </button>
                      {showSkillsDropdown && (
                        <div style={{
                          position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, zIndex: 50,
                          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 180, maxHeight: 220, overflowY: 'auto',
                        }}>
                          {agentConfig.skills.map((skill) => {
                            const active = selectedSkillIds.includes(skill.id)
                            return (
                              <button
                                key={skill.id}
                                onClick={() => toggleSkill(skill.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                  padding: '10px 12px', border: 'none', textAlign: 'left', fontSize: 14, cursor: 'pointer',
                                  background: active ? '#eff6ff' : 'transparent',
                                  color: active ? '#2563eb' : '#374151', minHeight: 44,
                                }}
                              >
                                <input type="checkbox" checked={active} readOnly style={{ width: 15, height: 15 }} />
                                {skill.name}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Text + send */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 12px' }}>
                {/* Config toggle button */}
                {hasConfig && (
                  <button
                    onClick={() => setShowToolbar((v) => !v)}
                    title="Model & Skills"
                    style={{
                      background: showToolbar ? '#eff6ff' : 'none',
                      border: '1px solid ' + (showToolbar ? '#bfdbfe' : '#e5e7eb'),
                      cursor: 'pointer', color: showToolbar ? '#2563eb' : '#9ca3af',
                      display: 'flex', alignItems: 'center', padding: 6, borderRadius: 8,
                      flexShrink: 0, minWidth: 32, minHeight: 32, justifyContent: 'center',
                    }}
                  >
                    <Sparkles size={14} />
                  </button>
                )}
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isMobile ? 'Message...' : 'Message the agent... (Enter to send)'}
                  rows={1}
                  disabled={isRunning}
                  style={{
                    flex: 1, padding: 0, border: 'none', fontSize: 15, outline: 'none',
                    resize: 'none', maxHeight: 120, fontFamily: 'inherit', lineHeight: 1.5,
                    background: 'transparent', color: '#111827',
                    opacity: isRunning ? 0.5 : 1,
                  }}
                />
                {isRunning ? (
                  <button
                    onClick={() => activeRemoteSessionId && interrupt(activeRemoteSessionId)}
                    style={{ padding: 8, borderRadius: 10, border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', flexShrink: 0, minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Stop"
                  >
                    <Square size={15} />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!text.trim()}
                    style={{
                      padding: 8, borderRadius: 10, border: 'none', flexShrink: 0,
                      cursor: text.trim() ? 'pointer' : 'not-allowed',
                      background: text.trim() ? '#3b82f6' : '#e5e7eb',
                      color: text.trim() ? '#fff' : '#9ca3af',
                      minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="Send"
                  >
                    <Send size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Minimized UI tiles panel */}
      <UITilePanel
        tiles={uiTiles}
        onRemove={handleRemoveTile}
        onRestore={handleRestoreTile}
        onAction={handleUIAction}
      />
    </div>
  )
}
