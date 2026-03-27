import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

/** Redirect buyers to dealer registration until `user.role === 'dealer'`. */
export function DealerGate() {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== 'dealer') {
    return <Navigate to="/dealer/register" replace />
  }
  return <Outlet />
}
