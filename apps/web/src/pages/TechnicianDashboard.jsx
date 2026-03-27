import { createElement } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  Eye,
  Image,
  MapPin,
  MessageCircle,
  Star,
  User,
  Wrench,
} from 'lucide-react'
import { apiJson } from '@/lib/api'
import { SPECIALIZATIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/LoadingSpinner'

const specLabel = (value) => SPECIALIZATIONS.find((s) => s.value === value)?.label ?? value

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function StatCard({ className, icon, iconClassName, label, children, style, to }) {
  const inner = (
    <Card
      className={cn(
        'animate-fade-in-up overflow-hidden border-slate-200/80 transition-all duration-200 dark:border-slate-700',
        to && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg',
        className,
      )}
      style={style}
    >
      <CardContent className="flex items-start gap-4 p-5">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md',
            iconClassName,
          )}
        >
          {createElement(icon, { className: 'h-5 w-5', 'aria-hidden': true })}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <div className="mt-1">{children}</div>
        </div>
        {to && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden />}
      </CardContent>
    </Card>
  )
  if (to) return <Link to={to} className="block">{inner}</Link>
  return inner
}

function profileCompletion(profile) {
  const checks = [
    Boolean(profile.displayName ?? profile.display_name),
    Boolean(profile.phoneBusiness ?? profile.phone_business),
    Boolean(profile.description),
    Boolean(profile.locationText ?? profile.location_text),
    Boolean(profile.bannerUrl ?? profile.banner_url),
    Boolean(
      Array.isArray(profile.specializations) && profile.specializations.length > 0,
    ),
    Boolean(
      profile.operatingHours &&
        typeof profile.operatingHours === 'object' &&
        Object.keys(profile.operatingHours).length > 0,
    ),
  ]
  const done = checks.filter(Boolean).length
  return { done, total: checks.length, pct: Math.round((done / checks.length) * 100) }
}

export function TechnicianDashboard() {
  const dashboardQ = useQuery({
    queryKey: ['technician', 'me', 'dashboard'],
    queryFn: () => apiJson('/technicians/me/dashboard'),
  })

  const profileQ = useQuery({
    queryKey: ['technician', 'me'],
    queryFn: () => apiJson('/technicians/me'),
  })

  if (dashboardQ.isLoading || profileQ.isLoading) return <LoadingSpinner />

  if (dashboardQ.isError || profileQ.isError) {
    const msg =
      dashboardQ.error?.message ||
      profileQ.error?.message ||
      'Could not load your technician workspace. Try again or complete your technician profile.'
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/80 p-6 dark:border-red-900/60 dark:bg-red-950/40">
        <p className="text-red-800 dark:text-red-300">{msg}</p>
      </div>
    )
  }

  const dash = dashboardQ.data || {}
  const profile = profileQ.data || {}

  const displayName = profile.displayName ?? profile.display_name ?? 'Technician'
  const locationText = profile.locationText ?? profile.location_text ?? 'Location not set'
  const isVerified = profile.isVerified ?? profile.is_verified ?? false
  const rawSpecs = profile.specializations
  const specs = Array.isArray(rawSpecs) ? rawSpecs : []
  const technicianId = profile.id

  const ratingAvg = Number(dash.ratingAvg ?? dash.rating_avg ?? 0)
  const ratingCount = Number(dash.ratingCount ?? dash.rating_count ?? 0)
  const pendingServiceRequests = Number(dash.pendingServiceRequests ?? dash.pending_service_requests ?? 0)
  const acceptedServiceRequests = Number(dash.acceptedServiceRequests ?? dash.accepted_service_requests ?? 0)
  const completedServiceRequests = Number(dash.completedServiceRequests ?? dash.completed_service_requests ?? 0)
  const unreadMessages = Number(dash.unreadMessages ?? dash.unread_messages ?? 0)
  const recentRequests = Array.isArray(dash.recentRequests) ? dash.recentRequests : []
  const latestReview = dash.latestReview ?? null

  const completion = profileCompletion(profile)

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section
        className="animate-fade-in-up overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700"
        style={{ animationDelay: '0ms' }}
      >
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <User className="h-5 w-5 shrink-0" aria-hidden />
                <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
                {isVerified ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-200 ring-1 ring-emerald-400/30"
                    title="Verified technician"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                    Verified
                  </span>
                ) : null}
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-200">
                <Wrench className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                Your technician workspace — service requests, ratings, and messages at a glance.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {specs.length > 0 ? (
                  specs.map((v) => (
                    <span
                      key={v}
                      className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/15 sm:text-sm"
                    >
                      {specLabel(v)}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300 ring-1 ring-white/10 sm:text-sm">
                    No specializations yet
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {locationText}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {technicianId && (
                <Button asChild variant="outline" size="sm" className="gap-1.5 border-white/30 bg-transparent text-white hover:bg-white/10">
                  <Link to={`/services/${technicianId}`}>
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    View public profile
                  </Link>
                </Button>
              )}
              <Button asChild variant="secondary" size="sm">
                <Link to="/technician/requests" className="inline-flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4" aria-hidden />
                  View requests
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <Link to="/technician/profile">Edit profile</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Profile completion */}
      {completion.pct < 100 && (
        <Card className="animate-fade-in-up border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 dark:border-amber-800/50 dark:from-amber-950/30 dark:to-orange-950/20" style={{ animationDelay: '30ms' }}>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <User className="h-4.5 w-4.5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Complete your profile</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{completion.done} of {completion.total} sections filled — a complete profile gets more bookings</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-200/60 dark:bg-amber-800/30">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                  style={{ width: `${completion.pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-right text-xs font-semibold text-amber-700 dark:text-amber-400">{completion.pct}%</p>
            </div>
            <Button asChild size="sm" className="shrink-0 gap-1.5">
              <Link to="/technician/profile">
                <Wrench className="h-3.5 w-3.5" aria-hidden />
                Edit profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Star}
          iconClassName="from-amber-400 to-orange-600"
          label="Average rating"
          style={{ animationDelay: '40ms' }}
        >
          <div className="flex flex-wrap items-end gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {ratingAvg > 0 ? ratingAvg.toFixed(1) : '\u2014'}
            </span>
            {ratingAvg > 0 ? (
              <div className="mb-0.5 flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      'h-3.5 w-3.5',
                      s <= Math.round(ratingAvg) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600',
                    )}
                    aria-hidden
                  />
                ))}
              </div>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {ratingCount === 0 ? 'No reviews yet' : `${ratingCount} review${ratingCount === 1 ? '' : 's'}`}
          </p>
        </StatCard>

        <StatCard
          icon={ClipboardList}
          iconClassName="from-sky-500 to-blue-700"
          label="Pending"
          style={{ animationDelay: '80ms' }}
          to="/technician/requests"
        >
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {pendingServiceRequests.toLocaleString()}
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400">awaiting response</p>
        </StatCard>

        <StatCard
          icon={CheckCircle2}
          iconClassName="from-emerald-500 to-green-700"
          label="Completed"
          style={{ animationDelay: '120ms' }}
        >
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {completedServiceRequests.toLocaleString()}
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400">jobs finished</p>
        </StatCard>

        <StatCard
          icon={MessageCircle}
          iconClassName="from-violet-500 to-purple-700"
          label="Messages"
          style={{ animationDelay: '160ms' }}
          to="/messages"
        >
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {unreadMessages.toLocaleString()}
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400">unread</p>
        </StatCard>
      </div>

      {/* Two-column layout: Recent requests + Latest review / Accepted jobs */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent pending requests */}
        <Card className="animate-fade-in-up border-slate-200/80 lg:col-span-3 dark:border-slate-700" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Recent pending requests</CardTitle>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {pendingServiceRequests === 0
                  ? 'No pending service requests right now.'
                  : `${pendingServiceRequests} request${pendingServiceRequests === 1 ? '' : 's'} waiting for action.`}
              </p>
            </div>
            <Link
              to="/technician/requests"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              View all
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {recentRequests.length > 0 ? (
              recentRequests.map((req, i) => (
                <div
                  key={req.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3.5 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
                    <User className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{req.buyerName ?? 'Buyer'}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-600 dark:text-slate-400">{req.description ?? 'No details'}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-500">
                      {req.preferredDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" aria-hidden />
                          {new Date(req.preferredDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden />
                        {timeAgo(req.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0 gap-1 text-xs">
                    <Link to="/technician/requests">
                      Review
                      <ArrowRight className="h-3 w-3" aria-hidden />
                    </Link>
                  </Button>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-sm dark:from-slate-500 dark:to-slate-700">
                    <ClipboardList className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Service requests</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Open the queue to accept or decline work</p>
                  </div>
                </div>
                <Link
                  to="/technician/requests"
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-800"
                >
                  Open
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Accepted jobs + Latest review */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Active / accepted jobs */}
          <Card className="animate-fade-in-up border-slate-200/80 dark:border-slate-700" style={{ animationDelay: '240ms' }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                    <Wrench className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{acceptedServiceRequests}</p>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Active jobs</p>
                  </div>
                </div>
                <Link
                  to="/technician/requests"
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  View
                </Link>
              </div>
              {acceptedServiceRequests > 0 && (
                <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-500/10 dark:text-blue-300">
                  You have {acceptedServiceRequests} accepted job{acceptedServiceRequests === 1 ? '' : 's'} in progress. Mark them complete when finished.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Latest review */}
          <Card className="animate-fade-in-up border-slate-200/80 dark:border-slate-700" style={{ animationDelay: '280ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-4 w-4 text-amber-500" aria-hidden />
                Latest review
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {latestReview ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            'h-3.5 w-3.5',
                            s <= Math.round(Number(latestReview.rating))
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200 dark:text-slate-600',
                          )}
                          aria-hidden
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{timeAgo(latestReview.createdAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{latestReview.buyerName ?? 'Buyer'}</p>
                  {latestReview.comment && (
                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      &ldquo;{latestReview.comment}&rdquo;
                    </p>
                  )}
                  {technicianId && (
                    <Link
                      to={`/services/${technicianId}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      See all reviews <ChevronRight className="h-3 w-3" aria-hidden />
                    </Link>
                  )}
                </div>
              ) : (
                <div className="py-2 text-center">
                  <Star className="mx-auto h-7 w-7 text-slate-200 dark:text-slate-700" aria-hidden />
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No reviews yet</p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Reviews will appear here once buyers rate your work.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <Card className="animate-fade-in-up border-slate-200/80 dark:border-slate-700" style={{ animationDelay: '320ms' }}>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/messages" className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" aria-hidden />
              View messages
              {unreadMessages > 0 && (
                <span className="ml-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">{unreadMessages}</span>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/technician/profile" className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" aria-hidden />
              Edit profile
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/technician/requests" className="inline-flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" aria-hidden />
              View all requests
            </Link>
          </Button>
          {technicianId && (
            <Button asChild variant="outline">
              <Link to={`/services/${technicianId}`} className="inline-flex items-center gap-1.5">
                <Eye className="h-4 w-4" aria-hidden />
                My public profile
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
