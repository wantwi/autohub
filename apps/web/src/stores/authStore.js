import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      authLoading: false,
      setAuthLoading: (authLoading) => set({ authLoading }),
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null, authLoading: false }),
    }),
    {
      name: 'autohub-auth',
      partialize: (state) => ({ token: state.token }),
    },
  ),
)
