import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import type { UISchema } from '../shared/types/ui-schema'
import { UIRenderer } from './components/generative-ui/UIRenderer'
import './styles/globals.css'

interface UIWindowPayload {
  sessionId: string
  renderBlockId: string
  schema: UISchema
}

function UIWindowApp() {
  const [payload, setPayload] = useState<UIWindowPayload | null>(null)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI.uiWindow.getSchema().then((result: any) => {
      const data = result?.data
      if (data) setPayload(data)
    })

    const cleanup = window.electronAPI.uiWindow.onSchema((data: UIWindowPayload) => {
      setPayload(data)
    })
    return cleanup
  }, [])

  const handleAction = (renderBlockId: string, actionId: string, data: Record<string, unknown>) => {
    setActionFeedback('Processing...')
    window.electronAPI.uiWindow.action({
      sessionId: payload?.sessionId ?? '',
      renderBlockId,
      actionId,
      data,
    }).then(() => {
      setActionFeedback('Action sent to agent')
      setTimeout(() => setActionFeedback(null), 2000)
    })
  }

  if (!payload) {
    return (
      <div className="ui-window-loading">
        <div className="ui-window-loading-spinner" />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading UI...</span>
      </div>
    )
  }

  return (
    <div className="ui-window-root">
      <div className="ui-window-drag-bar drag-region" />
      <div className="ui-window-content">
        <UIRenderer
          schema={payload.schema}
          sessionId={payload.sessionId}
          renderBlockId={payload.renderBlockId}
          onAction={handleAction}
        />
      </div>
      {actionFeedback && (
        <div className="ui-window-toast">
          {actionFeedback}
        </div>
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UIWindowApp />
  </React.StrictMode>
)
