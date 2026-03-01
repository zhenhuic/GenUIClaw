import { create } from 'zustand'
import type { AppSettings } from '../../shared/types/settings'
import { DEFAULT_SETTINGS } from '../../shared/types/settings'

interface SettingsState {
  settings: AppSettings
  loaded: boolean
  load: () => Promise<void>
  update: (partial: Partial<AppSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    const result = await window.electronAPI.settings.get()
    if (result && 'data' in result && result.data) {
      set({ settings: result.data as AppSettings, loaded: true })
    }
  },

  update: async (partial) => {
    const result = await window.electronAPI.settings.set(partial)
    if (!result || 'error' in result) return
    set((state) => ({ settings: { ...state.settings, ...partial } }))
  },
}))
