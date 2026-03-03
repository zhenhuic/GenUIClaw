import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, MessageSquare, LogOut } from 'lucide-react'
import { useAuthStore } from '../store/auth-store'
import { apiFetch } from '../utils'
import type { RemoteAgent } from '../types'

export function AgentsPage() {
  const { token, logout } = useAuthStore()
  const navigate = useNavigate()
  const [agents, setAgents] = useState<RemoteAgent[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [pairingKey, setPairingKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    loadAgents()
  }, [token])

  const loadAgents = async () => {
    try {
      const data = await apiFetch<RemoteAgent[]>('/agents', undefined, token!)
      setAgents(data)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const agent = await apiFetch<RemoteAgent>('/agents', {
        method: 'POST',
        body: JSON.stringify({ name, pairingKey }),
      }, token!)
      setAgents([agent, ...agents])
      setName('')
      setPairingKey('')
      setShowForm(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this agent?')) return
    try {
      await apiFetch(`/agents/${id}`, { method: 'DELETE' }, token!)
      setAgents(agents.filter((a) => a.id !== id))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '12px', borderRadius: 8, border: '1px solid #d1d5db',
    fontSize: 16, // 16px prevents iOS auto-zoom
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>GenUIClaw Remote</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0 0' }}>Your Remote Agents</p>
        </div>
        <button onClick={() => { logout(); navigate('/login') }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6b7280' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div style={{ maxWidth: 640, margin: '24px auto', padding: '0 16px' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Add Agent */}
        {showForm ? (
          <form onSubmit={handleAdd} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Add Remote Agent</h3>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Agent Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Work PC" style={inputStyle} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Pairing Key</label>
              <input value={pairingKey} onChange={(e) => setPairingKey(e.target.value)} placeholder="Paste pairing key from GenUIClaw settings" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} required />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={loading} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 500, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Adding...' : 'Add Agent'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: '2px dashed #d1d5db', background: 'none', cursor: 'pointer', fontSize: 13, color: '#6b7280', width: '100%', justifyContent: 'center', marginBottom: 20 }}
          >
            <Plus size={16} /> Add Remote Agent
          </button>
        )}

        {/* Agent list */}
        {agents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
            No agents yet. Add your first remote agent above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {agents.map((agent) => (
              <div
                key={agent.id}
                style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{agent.name}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', margin: '2px 0 0 0' }}>{agent.pairingKey.slice(0, 16)}...</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigate(`/chat/${agent.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#3b82f6', color: '#fff', fontSize: 14, fontWeight: 500, minHeight: 44 }}
                  >
                    <MessageSquare size={15} /> Chat
                  </button>
                  <button
                    onClick={() => handleDelete(agent.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 12px', borderRadius: 8, border: '1px solid #fee2e2', cursor: 'pointer', background: '#fff', color: '#ef4444', fontSize: 14, minHeight: 44 }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
