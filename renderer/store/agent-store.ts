import { create } from 'zustand'

interface AgentState {
  activeSessionId: string | null
  isRunning: boolean
  selectedModelId: string | null
  selectedSkillIds: string[]
  setRunning: (sessionId: string) => void
  setIdle: () => void
  setSelectedModelId: (id: string | null) => void
  setSelectedSkillIds: (ids: string[]) => void
  toggleSkillId: (id: string) => void
}

export const useAgentStore = create<AgentState>((set, get) => ({
  activeSessionId: null,
  isRunning: false,
  selectedModelId: null,
  selectedSkillIds: [],

  setRunning: (sessionId) => set({ activeSessionId: sessionId, isRunning: true }),
  setIdle: () => set({ activeSessionId: null, isRunning: false }),
  setSelectedModelId: (id) => set({ selectedModelId: id }),
  setSelectedSkillIds: (ids) => set({ selectedSkillIds: ids }),
  toggleSkillId: (id) => {
    const current = get().selectedSkillIds
    if (current.includes(id)) {
      set({ selectedSkillIds: current.filter((s) => s !== id) })
    } else {
      set({ selectedSkillIds: [...current, id] })
    }
  },
}))
