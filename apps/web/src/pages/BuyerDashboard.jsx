import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Car, MapPin, Search, Store, TrendingUp } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { normalizeList } from '@/lib/normalize'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PartCard } from '@/components/PartCard'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export function BuyerDashboard() {
  const user = useAuthStore((s) => s.user)

  const vehiclesQ = useQuery({
    queryKey: ['vehicles', 'me'],
    queryFn: () => apiJson('/users/me/vehicles'),
  })
  const partsQ = useQuery({
    queryKey: ['parts', 'latest-dash'],
    queryFn: () => apiJson('/parts?pageSize=4&sort=created_at:desc'),
  })
  const dealersQ = useQuery({
    queryKey: ['dealers', 'dash-featured'],
    queryFn: () => apiJson('/dealers?pageSize=3'),
  })
  const bookingsQ = useQuery({
    queryKey: ['buyer-bookings', 'dash'],
    queryFn: () => apiJson('/service-requests/me?pageSize=3'),
  })

  if (user?.role === 'dealer') {
    return <Navigate to="/dealer/dashboard" replace />
  }

  const { items: vehicles } = normalizeList(vehiclesQ.data)
  const { items: parts } = normalizeList(partsQ.data)
  const { items: dealers } = normalizeList(dealersQ.data)
  const bookings = Array.isArray(bookingsQ.data?.data) ? bookingsQ.data.data : []
  const bookingsTotal = bookingsQ.data?.meta?.total ?? bookings.length
  const displayName = user?.fullName || user?.full_name || 'driver'

  return (
    <div className="animate-fade-in-up space-y-10 pb-2">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Dashboard</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-4xl">
          Welcome back, <span className="text-brand-700 dark:text-brand-400">{displayName}</span>
        </h1>
        <p className="max-w-xl text-base text-slate-600 dark:text-slate-400">
          Manage your garage and discover parts from verified dealers across Ghana.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="group border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200/80 hover:shadow-md dark:border-slate-700">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 transition-colors group-hover:bg-brand-500/15 dark:bg-brand-500/20 dark:text-brand-400 dark:group-hover:bg-brand-500/20">
              <Car className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">My vehicles</p>
              <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {vehiclesQ.isLoading ? '—' : vehicles.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200/80 hover:shadow-md dark:border-slate-700" style={{ animationDelay: '75ms' }}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900/5 text-slate-700 transition-colors group-hover:bg-brand-500/10 group-hover:text-brand-700 dark:bg-slate-100/10 dark:text-slate-300 dark:group-hover:bg-brand-500/20 dark:group-hover:text-brand-400">
              <Store className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Dealers online</p>
              <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {dealersQ.isLoading ? '—' : dealers.length + '+'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200/80 hover:shadow-md dark:border-slate-700" style={{ animationDelay: '150ms' }}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 transition-colors group-hover:bg-violet-500/15 dark:bg-violet-500/20 dark:text-violet-400 dark:group-hover:bg-violet-500/20">
              <CalendarClock className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Bookings</p>
              <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {bookingsQ.isLoading ? '—' : bookingsTotal}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Your cars */}
        <Card className="border-slate-200/80 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold">Your garage</CardTitle>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Saved vehicles help you find matching parts faster.</p>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0 shadow-sm">
              <Link to="/profile">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {vehiclesQ.isLoading ? <LoadingSpinner /> : null}
            {vehicles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-800/80">
                <Car className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">No vehicles yet</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Add your car for smarter part recommendations.</p>
                <Button asChild size="sm" variant="outline" className="mt-4">
                  <Link to="/profile">Add vehicle</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {vehicles.map((v, i) => (
                  <li
                    key={v.id}
                    className="animate-fade-in-up flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm shadow-sm transition-all hover:border-brand-100 hover:shadow dark:border-slate-700 dark:bg-slate-900"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {v.make} {v.model}{' '}
                      <span className="font-normal text-slate-500 dark:text-slate-400">({v.year})</span>
                    </span>
                    {(v.isPrimary ?? v.is_primary) ? (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800 dark:bg-brand-500/15 dark:text-brand-300">Primary</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top dealers */}
        <Card className="border-slate-200/80 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold">Top dealers</CardTitle>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Verified shops near you.</p>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0 shadow-sm">
              <Link to="/dealers">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dealersQ.isLoading ? <LoadingSpinner /> : null}
            {dealers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                No dealers available yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {dealers.map((d, i) => {
                  const name = d.shopName ?? d.shop_name ?? 'Shop'
                  const loc = d.locationText ?? d.location_text ?? ''
                  const rating = Number(d.ratingAvg ?? d.rating_avg ?? 0)
                  return (
                    <li key={d.id}>
                      <Link
                        to={`/dealers/${d.id}`}
                        className="animate-fade-in-up flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm shadow-sm transition-all hover:border-brand-100 hover:shadow dark:border-slate-700 dark:bg-slate-900"
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{name}</p>
                          {loc && (
                            <p className="flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {loc}
                            </p>
                          )}
                        </div>
                        {rating > 0 && (
                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {rating.toFixed(1)}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent bookings */}
      <Card className="border-slate-200/80 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold">Recent bookings</CardTitle>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your latest service requests.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 shadow-sm">
            <Link to="/bookings">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {bookingsQ.isLoading ? <LoadingSpinner /> : null}
          {bookings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-800/80">
              <CalendarClock className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">No bookings yet</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Book a technician to get started.</p>
              <Button asChild size="sm" variant="outline" className="mt-4">
                <Link to="/services">Find technicians</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {bookings.map((b, i) => {
                const desc = b.description || 'Service request'
                const tech = b.technicianDisplayName || b.technician_display_name || 'Technician'
                const status = b.status || 'pending'
                const statusColors = {
                  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
                  accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
                  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
                  declined: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
                  cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                }
                return (
                  <li
                    key={b.id}
                    className="animate-fade-in-up flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm shadow-sm transition-all hover:border-brand-100 hover:shadow dark:border-slate-700 dark:bg-slate-900"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                        {desc.length > 60 ? desc.slice(0, 60) + '…' : desc}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{tech}</p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize', statusColors[status] || statusColors.pending)}>
                      {status}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Latest parts */}
      <div>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">New listings</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Recently posted parts from the marketplace.</p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to="/search">
              <TrendingUp className="mr-1.5 h-4 w-4" />
              Browse all
            </Link>
          </Button>
        </div>
        {partsQ.isLoading ? <LoadingSpinner /> : null}
        {parts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
            No listings available yet.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {parts.map((p, idx) => (
              <div
                key={p.id}
                className="group animate-fade-in-up"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="h-full transition-transform duration-300 group-hover:-translate-y-1">
                  <PartCard part={p} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg" className="gap-2 shadow-md shadow-brand-500/20">
          <Link to="/search">
            <Search className="h-4 w-4" aria-hidden />
            Find parts
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/dealers">
            <Store className="h-4 w-4" aria-hidden />
            Browse dealers
          </Link>
        </Button>
      </div>
    </div>
  )
}
