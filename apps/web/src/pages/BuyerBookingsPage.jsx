import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MessageSquare,
  User,
  Wrench,
  XCircle,
} from 'lucide-react'
import { apiJson } from '@/lib/api'
import { cn } from '@/lib/utils'
import { SERVICE_MODES, SERVICE_REQUEST_STATUSES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'

const PAGE_SIZE = 10

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_CONFIG = {
  pending: {
    badge: 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800/60',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
  },
  accepted: {
    badge: 'bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800/60',
    icon: CheckCircle2,
    color: 'text-blue-600 dark:text-blue-400',
  },
  completed: {
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/60',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  declined: {
    badge: 'bg-red-100 text-red-800 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800/60',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
  },
  cancelled: {
    badge: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600',
    icon: XCircle,
    color: 'text-slate-500 dark:text-slate-400',
  },
}

function statusLabel(status) {
  return SERVICE_REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status
}

function serviceModeLabel(mode) {
  if (!mode) return '—'
  return SERVICE_MODES.find((m) => m.value === mode)?.label ?? mode
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(dateStr)
}

export function BuyerBookingsPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)

  const q = useQuery({
    queryKey: ['buyer-bookings', statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      return apiJson(`/service-requests/me?${params}`)
    },
    placeholderData: keepPreviousData,
  })

  const items = Array.isArray(q.data?.data) ? q.data.data : Array.isArray(q.data) ? q.data : []
  const meta = q.data?.meta ?? {}
  const total = meta.total ?? items.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="animate-fade-in-up mx-auto max-w-4xl space-y-6 pb-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Bookings</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">My service requests</h1>
        <p className="text-slate-600 dark:text-slate-400">Track your bookings with technicians and service providers.</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => { setStatusFilter(tab.value); setPage(1) }}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
              statusFilter === tab.value
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {q.isLoading && !q.isPlaceholderData ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState
          title="No bookings found"
          description={statusFilter !== 'all' ? `No ${statusFilter} bookings.` : 'You haven\u2019t booked any technicians yet.'}
          actionLabel="Find a technician"
          actionTo="/services"
        />
      ) : (
        <div className="space-y-3">
          {items.map((r, i) => {
            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending
            const StatusIcon = cfg.icon
            const techName = r.technicianDisplayName || r.technician_display_name || 'Technician'
            const techId = r.technicianId || r.technician_id

            return (
              <Card
                key={r.id}
                className="animate-fade-in-up border-slate-200/80 shadow-sm transition-all hover:shadow-md dark:border-slate-700"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5">
                    {/* Status indicator */}
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', cfg.badge)}>
                      <StatusIcon className="h-5 w-5" />
                    </div>

                    {/* Main info */}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {r.description ? (r.description.length > 80 ? r.description.slice(0, 80) + '…' : r.description) : 'Service request'}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <User className="h-3 w-3" />
                            <Link
                              to={techId ? `/services/${techId}` : '#'}
                              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                            >
                              {techName}
                            </Link>
                          </div>
                        </div>
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', cfg.badge)}>
                          {statusLabel(r.status)}
                        </span>
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {r.preferredDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(r.preferredDate || r.preferred_date)}
                          </span>
                        )}
                        {r.preferredTime && (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {r.preferredTime || r.preferred_time}
                          </span>
                        )}
                        {(r.serviceMode || r.service_mode) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {serviceModeLabel(r.serviceMode || r.service_mode)}
                          </span>
                        )}
                        {r.vehicleInfo && (
                          <span className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {r.vehicleInfo || r.vehicle_info}
                          </span>
                        )}
                      </div>

                      {/* Technician note */}
                      {(r.technicianNote || r.technician_note) && (
                        <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Technician note</p>
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{r.technicianNote || r.technician_note}</p>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          Booked {timeAgo(r.createdAt || r.created_at)}
                        </span>
                        <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                          <Link to="/messages">
                            <MessageSquare className="h-3 w-3" />
                            Message
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
