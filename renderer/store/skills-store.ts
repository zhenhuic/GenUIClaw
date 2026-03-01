import { create } from 'zustand'
import type { SkillConfig } from '../../shared/types/settings'

interface SkillsState {
  skills: SkillConfig[]
  loaded: boolean
  load: () => Promise<void>
  toggle: (id: string) => Promise<void>
  save: (name: string, content: string) => Promise<SkillConfig | null>
  update: (id: string, name: string, content: string) => Promise<SkillConfig | null>
  remove: (id: string) => Promise<boolean>
  importFromZip: () => Promise<SkillConfig[]>
}

export const useSkillsStore = create<SkillsState>((set, get) => ({
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

  save: async (name, content) => {
    const result = await window.electronAPI.skills.save({ name, content })
    if ('data' in result && result.data) {
      set((state) => ({ skills: [...state.skills, result.data!] }))
      return result.data
    }
    return null
  },

  update: async (id, name, content) => {
    const result = await window.electronAPI.skills.update({ id, name, content })
    if ('data' in result && result.data) {
      const updated = result.data
      set((state) => ({
        skills: state.skills.map((s) => (s.id === id ? updated : s)),
      }))
      return updated
    }
    return null
  },

  remove: async (id) => {
    const result = await window.electronAPI.skills.delete(id)
    if (!('error' in result)) {
      set((state) => ({
        skills: state.skills.filter((s) => s.id !== id),
      }))
      return true
    }
    return false
  },

  importFromZip: async () => {
    const result = await window.electronAPI.skills.import()
    if ('data' in result && result.data) {
      set((state) => ({ skills: [...state.skills, ...result.data!] }))
      return result.data
    }
    return []
  },
}))
