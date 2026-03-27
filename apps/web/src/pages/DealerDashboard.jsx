import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Boxes, CalendarDays, Eye, MessageCircle, Phone, Star, Store, Users } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { VerifiedBadge } from '@/components/VerifiedBadge'

function getApiCode(error) {
  return error?.payload?.error?.code
}

function shopCompletion(dealer) {
  if (!dealer) return 0
  const checks = [
    Boolean(dealer.shopName ?? dealer.shop_name),
    Boolean(dealer.phoneBusiness ?? dealer.phone_business),
    Boolean(dealer.locationText ?? dealer.location_text),
    Boolean(dealer.description),
    Boolean(dealer.bannerUrl ?? dealer.banner_url),
  ]
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}

export function DealerDashboard() {
  const dashboardQ = useQuery({
    queryKey: ['dealer', 'me', 'dashboard'],
    queryFn: () => apiJson('/dealers/me/dashboard'),
  })

  const dealerQ = useQuery({
    queryKey: ['dealer', 'me'],
    queryFn: () => apiJson('/dealers/me'),
  })

  if (dashboardQ.isLoading || dealerQ.isLoading) return <LoadingSpinner />

  if (dashboardQ.isError || dealerQ.isError) {
    const dashboardCode = getApiCode(dashboardQ.error)
    const dealerCode = getApiCode(dealerQ.error)
    const pending = dashboardCode === 'DEALER_NOT_APPROVED' || dealerCode === 'DEALER_NOT_APPROVED'
    return (
      <div className="space-y-4">
        <p className="text-red-700 dark:text-red-400">
          {pending
            ? 'Your dealer application is pending or rejected. Approval is required before dealer workspace features are enabled.'
            : 'Could not load dealer workspace. Register your shop first.'}
        </p>
        <Button asChild>
          <Link to="/dealer/register">{pending ? 'Review application' : 'Register as dealer'}</Link>
        </Button>
      </div>
    )
  }

  const d = dashboardQ.data || {}
  const dealer = dealerQ.data || {}

  const completedProfile = shopCompletion(dealer)
  const shopName = dealer.shopName ?? dealer.shop_name ?? 'Dealer shop'
  const locationText = dealer.locationText ?? dealer.location_text ?? 'Location not set'
  const phoneBusiness = dealer.phoneBusiness ?? dealer.phone_business ?? 'Phone not set'
  const isVerified = dealer.isVerified ?? dealer.is_verified ?? false
  const dealerId = dealer.id ?? d.dealerId ?? d.dealer_id

  const partViews = d.partViews ?? d.part_views ?? d.views ?? d.parts_views ?? 0
  const reviewCount = d.reviewCount ?? d.review_count ?? 0
  const avgRating = Number(d.avgRating ?? d.avg_rating ?? 0)
  const unreadMessages = d.unreadMessages ?? d.unread_messages ?? 0

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                <h1 className="text-2xl font-bold tracking-tight">{shopName}</h1>
                {isVerified ? <VerifiedBadge className="text-brand-300" /> : null}
              </div>
              <p className="mt-2 text-sm text-slate-200">Your dealer workspace -- listings, reviews, and messages at a glance.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">{locationText}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                  <Phone className="h-3.5 w-3.5" />
                  {phoneBusiness}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Profile {completedProfile}% complete
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link to="/dealer/parts" className="inline-flex items-center gap-1.5">
                  <Boxes className="h-4 w-4" aria-hidden />
                  View listings
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <Link to="/dealer/profile">Update profile</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              <Eye className="h-4 w-4" />
              Listing views
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {Number(partViews).toLocaleString()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              <Users className="h-4 w-4" />
              Total reviews
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{reviewCount}</span>
            {reviewCount > 0 && dealerId && (
              <Link to={`/dealers/${dealerId}`} className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
                View all
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              <Star className="h-4 w-4" />
              Average rating
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {avgRating > 0 ? avgRating.toFixed(1) : '—'}
            </span>
            {avgRating > 0 && (
              <div className="mb-1 flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${s <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/messages" className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" aria-hidden />
              View messages
              {unreadMessages > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-bold leading-none text-white">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dealer/parts">Manage parts</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dealer/profile">Complete shop profile</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dealer/parts/new">Add new part</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
