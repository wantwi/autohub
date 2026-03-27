import { Link } from 'react-router-dom'
import { CalendarDays, Lock, MapPin, Phone, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

function formatMemberSince(createdAt) {
  if (!createdAt) return 'New dealer'
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return 'New dealer'
  return `Member since ${date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
}

function initialsFromName(name) {
  const safe = String(name || 'Dealer').trim()
  const parts = safe.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || 'D'
}

export function DealerCard({ dealer, className }) {
  const user = useAuthStore((s) => s.user)
  const shopName = dealer.shopName ?? dealer.shop_name ?? 'Dealer'
  const locationText = dealer.locationText ?? dealer.location_text ?? ''
  const isVerified = dealer.isVerified ?? dealer.is_verified ?? false
  const ratingAvg = Number(dealer.ratingAvg ?? dealer.rating_avg ?? 0)
  const ratingCount = dealer.ratingCount ?? dealer.rating_count ?? 0
  const phoneBusiness = dealer.phoneBusiness ?? dealer.phone_business
  const createdAt = dealer.createdAt ?? dealer.created_at
  const profileImage = dealer.bannerUrl ?? dealer.banner_url ?? dealer.avatarUrl ?? dealer.avatar_url
  const openOnHolidays = Boolean(dealer.openOnHolidays ?? dealer.open_on_holidays)

  return (
    <Card
      className={cn(
        'h-full overflow-hidden border-slate-200/80 bg-white/95 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900/95 dark:hover:shadow-slate-900/60',
        className,
      )}
    >
      <Link to={`/dealers/${dealer.id}`} className="flex h-full flex-col">
        <CardContent className="flex flex-1 flex-col space-y-4 p-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
              {profileImage ? (
                <img src={profileImage} alt={shopName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {initialsFromName(shopName)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{shopName}</h3>
                {isVerified ? <VerifiedBadge title="Verified dealer" className="shrink-0" /> : null}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{locationText || 'Location not set'}</span>
                </span>

                {phoneBusiness && user ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{phoneBusiness}</span>
                  </span>
                ) : !user ? (
                  <span className="inline-flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <Lock className="h-3 w-3" />
                    <span className="text-xs">Sign in for contact</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Star className="h-3.5 w-3.5 fill-current" />
              {ratingAvg.toFixed(1)}
              <span className="font-normal text-slate-500 dark:text-slate-400">({ratingCount} reviews)</span>
            </span>

            <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatMemberSince(createdAt)}
            </span>

            {openOnHolidays ? (
              <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 dark:bg-brand-500/15 dark:text-brand-400">
                Open holidays
              </span>
            ) : null}
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
