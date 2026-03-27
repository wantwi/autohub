import { Badge } from '@/components/ui/badge'

const MAP = {
  pending: { label: 'Pending', variant: 'warning' },
  confirmed: { label: 'Confirmed', variant: 'secondary' },
  dispatched: { label: 'Dispatched', variant: 'default' },
  delivered: { label: 'Delivered', variant: 'success' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export function StatusBadge({ status }) {
  const key = String(status || '').toLowerCase()
  const cfg = MAP[key] || { label: status || 'Unknown', variant: 'outline' }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
