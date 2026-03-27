import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { apiJson } from '@/lib/api'

export function useAuthBootstrap() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)
  const setAuthLoading = useAuthStore((s) => s.setAuthLoading)

  useEffect(() => {
    if (!token) {
      setUser(null)
      setAuthLoading(false)
      return
    }
    let cancelled = false
    setAuthLoading(true)
    ;(async () => {
      try {
        const me = await apiJson('/auth/me')
        if (!cancelled) setUser(me)
      } catch {
        if (!cancelled) logout()
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, setUser, logout, setAuthLoading])

  return { token, user }
}
