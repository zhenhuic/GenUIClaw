import React, { useRef, useState, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import { UIRenderer } from '@generative-ui/UIRenderer'
import { useUIDisplayStore } from '../../store/ui-display-store'
import { useAgent } from '../../hooks/useAgent'

const MIN_HEIGHT_VH = 30
const MAX_HEIGHT_VH = 92
const DEFAULT_HEIGHT_VH = 55
const DISMISS_THRESHOLD_VH = 20 // swipe down below this to dismiss

export function UIBottomSheet() {
  const { activeSheet, closeSheet } = useUIDisplayStore()
  const { sendUIAction } = useAgent()
  const [height, setHeight] = useState(DEFAULT_HEIGHT_VH) // vh
  const [closing, setClosing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)
  const dragStartH = useRef(DEFAULT_HEIGHT_VH)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Reset height when sheet opens with a new schema
  useEffect(() => {
    if (activeSheet) {
      setHeight(DEFAULT_HEIGHT_VH)
      setClosing(false)
    }
  }, [activeSheet?.renderBlockId])

  const handleClose = useCallback(() => {
    setClosing(true)
    // Wait for close animation to complete
    setTimeout(() => {
      closeSheet()
      setClosing(false)
      setHeight(DEFAULT_HEIGHT_VH)
    }, 250)
  }, [closeSheet])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    dragStartH.current = height
    setIsDragging(true)
  }, [height])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaY = dragStartY.current - e.touches[0].clientY
    const deltaVh = (deltaY / window.innerHeight) * 100
    const newHeight = Math.min(MAX_HEIGHT_VH, Math.max(10, dragStartH.current + deltaVh))
    setHeight(newHeight)
  }, [])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    // If swiped down below dismiss threshold, close the sheet
    if (height < DISMISS_THRESHOLD_VH) {
      handleClose()
    } else if (height < MIN_HEIGHT_VH) {
      // Snap back to minimum
      setHeight(MIN_HEIGHT_VH)
    }
  }, [height, handleClose])

  // Handle action from UI components
  const handleAction = useCallback(
    (renderBlockId: string, actionId: string, data: Record<string, unknown>) => {
      sendUIAction(renderBlockId, actionId, data)
    },
    [sendUIAction]
  )

  if (!activeSheet) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={closing ? 'bottom-sheet-backdrop-closing' : 'bottom-sheet-backdrop'}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={closing ? 'bottom-sheet bottom-sheet-closing' : 'bottom-sheet'}
        style={{
          height: `${height}vh`,
          transition: isDragging ? 'none' : 'height 0.2s ease-out',
        }}
      >
        {/* Drag handle area — larger touch target */}
        <div
          className="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none', minHeight: 28 }}
        >
          <div className="bottom-sheet-handle" />
        </div>

        {/* Header with close button */}
        <div
          className="flex items-center justify-between px-4 pb-2"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            Interactive UI
          </span>
          <button
            onClick={handleClose}
            className="flex items-center justify-center rounded-full"
            style={{
              width: 28,
              height: 28,
              background: 'var(--surface-secondary)',
              color: 'var(--text-muted)',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="bottom-sheet-content">
          <UIRenderer
            schema={activeSheet.schema}
            sessionId={activeSheet.sessionId}
            renderBlockId={activeSheet.renderBlockId}
            onAction={handleAction}
          />
        </div>
      </div>
    </>
  )
}
