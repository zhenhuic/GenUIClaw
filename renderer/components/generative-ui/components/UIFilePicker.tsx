import React, { useRef } from 'react'
import { Upload } from 'lucide-react'
import type { UIFilePickerComponent } from '../../../../shared/types/ui-schema'
import type { UIComponentBaseProps } from '../registry'

type Props = UIComponentBaseProps & { component: UIFilePickerComponent }

export function UIFilePicker({ component, renderBlockId, onAction }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const fileData = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      path: (f as File & { path?: string }).path, // Electron provides the actual file path
    }))
    onAction(renderBlockId, component.actionId, { files: fileData })
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {component.label}
      </label>
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm w-fit transition-colors"
        style={{
          background: 'var(--surface-secondary)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')
        }
      >
        <Upload size={14} />
        Choose {component.multiple ? 'Files' : 'File'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={component.accept}
        multiple={component.multiple}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}
