import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function TechnicianGate() {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== 'technician') {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
