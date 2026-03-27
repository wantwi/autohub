import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export function ProtectedRoute({ children, dealerOnly }) {
  const location = useLocation()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.authLoading)

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (authLoading || (token && !user)) {
    return <LoadingSpinner label="Loading session…" />
  }
  if (dealerOnly && user?.role !== 'dealer') {
    return <Navigate to="/dashboard" replace />
  }
  return children ?? <Outlet />
}
