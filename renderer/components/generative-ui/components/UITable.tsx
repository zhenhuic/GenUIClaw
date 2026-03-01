import React, { useState } from 'react'
import type { UITableComponent } from '../../../../shared/types/ui-schema'
import type { UIComponentBaseProps } from '../registry'

type Props = UIComponentBaseProps & { component: UITableComponent }

export function UITable({ component, renderBlockId, onAction }: Props) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)

  const pageSize = component.pagination?.pageSize ?? component.rows.length
  const totalPages = Math.ceil(component.rows.length / pageSize)

  const sortedRows = sortKey
    ? [...component.rows].sort((a, b) => {
        const av = String(a[sortKey] ?? '')
        const bv = String(b[sortKey] ?? '')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    : component.rows

  const pagedRows = sortedRows.slice(page * pageSize, (page + 1) * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handleRowSelect = (idx: number, row: Record<string, unknown>) => {
    if (!component.selectable) return
    const next = new Set(selectedRows)
    if (next.has(idx)) {
      next.delete(idx)
    } else {
      next.add(idx)
    }
    setSelectedRows(next)
    if (component.onRowSelectActionId) {
      onAction(renderBlockId, component.onRowSelectActionId, { selectedRow: row, index: idx })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {component.title && (
        <h3
          className="font-semibold"
          style={{ color: 'var(--text)', fontSize: 15 }}
        >
          {component.title}
        </h3>
      )}

      <div
        className="overflow-x-auto rounded-xl"
        style={{
          border: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: 'var(--surface-secondary)' }}>
              {component.selectable && <th className="w-10 px-3 py-2.5" />}
              {component.columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2.5 text-left font-medium text-xs uppercase tracking-wide"
                  style={{
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border)',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    letterSpacing: '0.05em',
                  }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => handleRowSelect(page * pageSize + idx, row)}
                className="transition-colors"
                style={{
                  background: selectedRows.has(page * pageSize + idx)
                    ? 'var(--accent-dim)'
                    : 'transparent',
                  cursor: component.selectable ? 'pointer' : 'default',
                }}
                onMouseEnter={(e) => {
                  if (!selectedRows.has(page * pageSize + idx))
                    (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'
                }}
                onMouseLeave={(e) => {
                  if (!selectedRows.has(page * pageSize + idx))
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                {component.selectable && (
                  <td className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(page * pageSize + idx)}
                      onChange={() => {}}
                      style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                    />
                  </td>
                )}
                {component.columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-2.5 selectable"
                    style={{
                      color: 'var(--text)',
                      borderBottom: idx < pagedRows.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    {String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          className="flex items-center gap-3 justify-between text-xs px-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span style={{ color: 'var(--text-muted)' }}>
            {component.rows.length} rows
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 rounded-md transition-colors"
              style={{
                opacity: page === 0 ? 0.4 : 1,
                background: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
                cursor: page === 0 ? 'default' : 'pointer',
              }}
            >
              ← Prev
            </button>
            <span>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-2.5 py-1 rounded-md transition-colors"
              style={{
                opacity: page >= totalPages - 1 ? 0.4 : 1,
                background: 'var(--surface-secondary)',
                border: '1px solid var(--border)',
                cursor: page >= totalPages - 1 ? 'default' : 'pointer',
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
