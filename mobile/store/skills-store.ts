/**
 * Skills store — identical to desktop, reads via remote-api.
 * Import via zip is disabled on mobile (returns empty).
 */

import { create } from 'zustand'
import type { SkillConfig } from '@shared/types/settings'

interface SkillsState {
  skills: SkillConfig[]
  loaded: boolean
  load: () => Promise<void>
  toggle: (id: string) => Promise<void>
}

export const useSkillsStore = create<SkillsState>((set) => ({
  skills: [],
  loaded: false,

  load: async () => {
    const result = await window.electronAPI.skills.list()
    if ('data' in result && result.data) {
      set({ skills: result.data, loaded: true })
    }
  },

  toggle: async (id) => {
    const result = await window.electronAPI.skills.toggle(id)
    if ('data' in result) {
      set((state) => ({
        skills: state.skills.map((s) =>
          s.id === id ? { ...s, enabled: !s.enabled } : s
        ),
      }))
    }
  },
}))
