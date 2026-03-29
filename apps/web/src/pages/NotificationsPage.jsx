import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, BellOff, CheckCheck, CalendarClock, MessageCircle, Package, ShieldAlert, Star } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { cn } from '@/lib/utils'

const TYPE_ICONS = {
  booking_new: CalendarClock,
  booking_accepted: CalendarClock,
  booking_declined: CalendarClock,
  booking_completed: CalendarClock,
  booking_cancelled: CalendarClock,
  order_update: Package,
  new_message: MessageCircle,
  review: Star,
  report: ShieldAlert,
}

const TYPE_COLORS = {
  booking_new: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  booking_accepted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  booking_declined: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  booking_completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  booking_cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  order_update: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  new_message: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  default: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function NotificationsPage() {
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiJson('/notifications?pageSize=50'),
  })

  const markAll = useMutation({
    mutationFn: () => apiJson('/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const markOne = useMutation({
    mutationFn: (id) => apiJson(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const notifications = q.data?.data || []
  const hasUnread = notifications.some((n) => !n.isRead)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Activity</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Notifications</h1>
        </div>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {q.isLoading && <LoadingSpinner />}

      {!q.isLoading && notifications.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <BellOff className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">No notifications yet</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            You'll see booking updates, messages, and more here.
          </p>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const Icon = TYPE_ICONS[n.type] || Bell
            const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.default
            const content = (
              <div
                className={cn(
                  'group flex items-start gap-3 rounded-xl border px-4 py-3 transition-all duration-200',
                  n.isRead
                    ? 'border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900'
                    : 'border-brand-100/60 bg-brand-50/30 shadow-sm dark:border-brand-800/30 dark:bg-brand-950/20',
                )}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', colorClass)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-semibold', n.isRead ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100')}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    )}
                  </div>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{n.body}</p>
                  )}
                  <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            )

            const handleClick = () => {
              if (!n.isRead) markOne.mutate(n.id)
            }

            if (n.link) {
              return (
                <Link key={n.id} to={n.link} onClick={handleClick} className="animate-fade-in-up block">
                  {content}
                </Link>
              )
            }
            return (
              <div key={n.id} onClick={handleClick} className="animate-fade-in-up cursor-pointer">
                {content}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
