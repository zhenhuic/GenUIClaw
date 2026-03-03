import React, { useState } from 'react'
import { X, Layout } from 'lucide-react'
import { UIRenderer } from '../generative-ui/UIRenderer'
import type { UISchema } from '../../types'

interface UITile {
  renderBlockId: string
  title: string
  schema: UISchema
}

interface UITilePanelProps {
  tiles: UITile[]
  onRemove: (renderBlockId: string) => void
  onRestore: (renderBlockId: string) => void
  onAction: (renderBlockId: string, actionId: string, data: Record<string, unknown>) => void
}

export function UITilePanel({ tiles, onRemove, onRestore, onAction }: UITilePanelProps) {
  const [expandedTile, setExpandedTile] = useState<string | null>(null)

  if (tiles.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      zIndex: 100,
    }}>
      {tiles.map((tile) => (
        <TileItem
          key={tile.renderBlockId}
          tile={tile}
          isExpanded={expandedTile === tile.renderBlockId}
          onToggleExpand={() => setExpandedTile(expandedTile === tile.renderBlockId ? null : tile.renderBlockId)}
          onRemove={() => onRemove(tile.renderBlockId)}
          onRestore={() => {
            onRestore(tile.renderBlockId)
            setExpandedTile(null)
          }}
          onAction={onAction}
        />
      ))}
    </div>
  )
}

interface TileItemProps {
  tile: UITile
  isExpanded: boolean
  onToggleExpand: () => void
  onRemove: () => void
  onRestore: () => void
  onAction: (renderBlockId: string, actionId: string, data: Record<string, unknown>) => void
}

function TileItem({ tile, isExpanded, onToggleExpand, onRemove, onRestore, onAction }: TileItemProps) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>
      {/* Expanded panel (pops out to the left) */}
      {isExpanded && (
        <div style={{
          position: 'absolute',
          right: 40,
          top: 0,
          width: 320,
          maxHeight: 480,
          overflowY: 'auto',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          padding: 16,
          zIndex: 200,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{tile.title}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={onRestore}
                title="Restore to chat"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6b7280', fontSize: 12 }}
              >
                Restore
              </button>
              <button
                onClick={onRemove}
                title="Close"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af', display: 'flex', alignItems: 'center' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <UIRenderer
            schema={tile.schema}
            renderBlockId={tile.renderBlockId}
            onAction={(actionId, data) => onAction(tile.renderBlockId, actionId, data)}
          />
        </div>
      )}

      {/* Tile tab (always visible on the right edge) */}
      <button
        onClick={onToggleExpand}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          width: 36,
          minHeight: 72,
          background: isExpanded ? '#3b82f6' : '#fff',
          border: '1px solid #e5e7eb',
          borderRight: 'none',
          borderRadius: '8px 0 0 8px',
          cursor: 'pointer',
          padding: '8px 4px',
          boxShadow: '-2px 0 8px rgba(0,0,0,0.08)',
        }}
        title={tile.title}
      >
        <Layout size={14} style={{ color: isExpanded ? '#fff' : '#6b7280', flexShrink: 0 }} />
        <span style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
          fontSize: 11,
          fontWeight: 500,
          color: isExpanded ? '#fff' : '#374151',
          maxHeight: 80,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {tile.title}
        </span>
      </button>
    </div>
  )
}
