/**
 * UI display preferences — controls how Generative UI is rendered on mobile.
 */

import { create } from 'zustand'

export type UIDisplayMode = 'inline' | 'bottomsheet'

interface UIDisplayState {
  mode: UIDisplayMode
  /** Currently open bottom sheet schema, if any */
  activeSheet: {
    renderBlockId: string
    sessionId: string
    schema: import('@shared/types/ui-schema').UISchema
  } | null

  setMode: (mode: UIDisplayMode) => void
  openSheet: (renderBlockId: string, sessionId: string, schema: import('@shared/types/ui-schema').UISchema) => void
  closeSheet: () => void
}

export const useUIDisplayStore = create<UIDisplayState>((set) => ({
  mode: 'inline',
  activeSheet: null,

  setMode: (mode) => set({ mode }),
  openSheet: (renderBlockId, sessionId, schema) =>
    set({ activeSheet: { renderBlockId, sessionId, schema } }),
  closeSheet: () => set({ activeSheet: null }),
}))
