import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Building2, CalendarClock, ClipboardList, Flag, MessageCircle, MessageSquareText, Package, PackagePlus, ShieldCheck, Users, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { apiJson } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { cn } from '@/lib/utils'

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <Card className="group border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminDashboardPage() {
  const q = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => apiJson('/dealers/admin/overview'),
  })

  const analyticsQ = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => apiJson('/analytics/overview'),
  })

  const bookingsQ = useQuery({
    queryKey: ['admin', 'bookings-by-status'],
    queryFn: () => apiJson('/analytics/bookings-by-status'),
  })

  const qc = useQueryClient()
  const autoVerifyM = useMutation({
    mutationFn: () => apiJson('/cron/auto-verify/admin', { method: 'POST' }),
    onSuccess: (resp) => {
      const d = resp?.data || {}
      const total = (d.dealersVerified || 0) + (d.techniciansVerified || 0)
      if (total > 0) {
        toast.success(`Verified ${d.dealersVerified} dealer(s) and ${d.techniciansVerified} technician(s)`)
      } else {
        toast.info('No new dealers or technicians qualified for verification.')
      }
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (e) => toast.error(e.message || 'Auto-verification failed'),
  })

  if (q.isLoading) return <LoadingSpinner />

  const data = q.data || {}
  const stats = analyticsQ.data?.data || {}
  const bookingStats = bookingsQ.data?.data || []

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Admin workspace</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Overview of the platform and management tools.</p>
          </div>
          <ShieldCheck className="h-8 w-8 text-slate-900 dark:text-slate-100" aria-hidden />
        </div>
      </section>

      {/* Platform stats */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Platform Overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Users" value={stats.total_users ?? '—'} color="bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400" icon={Users} />
          <StatCard label="Buyers" value={stats.buyers ?? '—'} color="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" icon={Users} />
          <StatCard label="Dealers" value={stats.dealers ?? '—'} color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" icon={Building2} />
          <StatCard label="Technicians" value={stats.technicians ?? '—'} color="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" icon={Wrench} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Parts" value={stats.total_parts ?? '—'} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" icon={Package} />
        <StatCard label="Total Orders" value={stats.total_orders ?? '—'} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" icon={Package} />
        <StatCard label="Total Bookings" value={stats.total_bookings ?? '—'} color="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" icon={CalendarClock} />
        <StatCard label="Messages Sent" value={stats.total_messages ?? '—'} color="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" icon={MessageCircle} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Bookings by status */}
        <Card className="border-slate-200/80 shadow-sm dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-base">Bookings by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingStats.length === 0 ? (
              <p className="text-sm text-slate-500">No bookings yet.</p>
            ) : (
              <div className="space-y-3">
                {bookingStats.map((b) => {
                  const total = bookingStats.reduce((s, x) => s + x.count, 0)
                  const pct = total > 0 ? Math.round((b.count / total) * 100) : 0
                  const colors = {
                    pending: 'bg-amber-500',
                    accepted: 'bg-blue-500',
                    completed: 'bg-emerald-500',
                    declined: 'bg-red-500',
                    cancelled: 'bg-slate-400',
                  }
                  return (
                    <div key={b.status}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium capitalize text-slate-700 dark:text-slate-300">{b.status}</span>
                        <span className="tabular-nums text-slate-500">{b.count} ({pct}%)</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={cn('h-full rounded-full transition-all', colors[b.status] || 'bg-slate-400')} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Moderation */}
        <Card className="border-slate-200/80 shadow-sm dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-base">Moderation & Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-red-500" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Pending Reports</span>
              </div>
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', Number(stats.pending_reports) > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
                {stats.pending_reports ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-sky-500" />
                <span className="text-sm text-slate-700 dark:text-slate-300">User Feedback</span>
              </div>
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                {stats.total_feedback ?? 0}
              </span>
            </div>

            {/* Dealer onboarding summary */}
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Onboarding</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-900/20">
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{Number(data.pendingOnboarding || 0)}</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500">Pending</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/20">
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{Number(data.approvedOnboarding || 0)}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500">Approved</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{Number(data.verifiedDealers || 0)}</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-500">Verified</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/admin/onboarding" className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              Dealer onboarding
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/dealer-parts" className="inline-flex items-center gap-1.5">
              <PackagePlus className="h-4 w-4" />
              Upload listing for dealer
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/onboarding" className="inline-flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" />
              Review onboarding queue
            </Link>
          </Button>
          <Button
            variant="outline"
            disabled={autoVerifyM.isPending}
            onClick={() => autoVerifyM.mutate()}
            className="inline-flex items-center gap-1.5"
          >
            <BadgeCheck className="h-4 w-4" />
            {autoVerifyM.isPending ? 'Running…' : 'Run Auto-Verification'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

