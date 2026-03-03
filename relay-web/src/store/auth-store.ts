import { create } from 'zustand'

interface AuthState {
  token: string | null
  setToken: (token: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('auth_token'),
  setToken: (token) => {
    if (token) localStorage.setItem('auth_token', token)
    else localStorage.removeItem('auth_token')
    set({ token })
  },
  logout: () => {
    localStorage.removeItem('auth_token')
    set({ token: null })
  },
}))
