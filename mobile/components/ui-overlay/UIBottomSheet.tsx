import React, { useRef, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { UIRenderer } from '@generative-ui/UIRenderer'
import { useUIDisplayStore } from '../../store/ui-display-store'
import { useAgent } from '../../hooks/useAgent'

export function UIBottomSheet() {
  const { activeSheet, closeSheet } = useUIDisplayStore()
  const { sendUIAction } = useAgent()
  const [height, setHeight] = useState(50) // vh
  const dragStartY = useRef(0)
  const dragStartH = useRef(50)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    dragStartH.current = height
  }, [height])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaY = dragStartY.current - e.touches[0].clientY
    const deltaVh = (deltaY / window.innerHeight) * 100
    const newHeight = Math.min(90, Math.max(30, dragStartH.current + deltaVh))
    setHeight(newHeight)
  }, [])

  if (!activeSheet) return null

  return (
    <>
      {/* Backdrop */}
      <div className="bottom-sheet-backdrop" onClick={closeSheet} />

      {/* Sheet */}
      <div className="bottom-sheet" style={{ height: `${height}vh` }}>
        {/* Drag handle */}
        <div
          className="flex justify-center pt-2 pb-1 cursor-grab"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          style={{ touchAction: 'none' }}
        >
          <div className="bottom-sheet-handle" />
        </div>

        {/* Close button */}
        <div className="flex justify-end px-3 pb-1">
          <button
            onClick={closeSheet}
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="bottom-sheet-content">
          <UIRenderer
            schema={activeSheet.schema}
            sessionId={activeSheet.sessionId}
            renderBlockId={activeSheet.renderBlockId}
            onAction={sendUIAction}
          />
        </div>
      </div>
    </>
  )
}
