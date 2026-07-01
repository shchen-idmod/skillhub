import { create } from 'zustand'
import { authApi } from '@/api/client'
import type { User } from '@/api/client'

interface AuthState {
  user: User | null
  token: string | null
  initialized: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  initialized: false,
  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    set({ user, token })
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
  init: async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const { data } = await authApi.me()
        set({ user: data, initialized: true })
      } catch {
        localStorage.removeItem('token')
        set({ user: null, token: null, initialized: true })
      }
    } else {
      set({ initialized: true })
    }
  },
}))
