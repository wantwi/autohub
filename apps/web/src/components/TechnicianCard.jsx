import { Link } from 'react-router-dom'
import { BadgeCheck, Building2, MapPin, Star, Truck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { SPECIALIZATIONS, SERVICE_MODES } from '@/lib/constants'
import { cn } from '@/lib/utils'

function specLabel(value) {
  const v = String(value || '').trim()
  return SPECIALIZATIONS.find((s) => s.value === v)?.label ?? v
}

function serviceModeMeta(mode) {
  const m = String(mode || 'both').trim()
  return SERVICE_MODES.find((s) => s.value === m) ?? SERVICE_MODES.find((s) => s.value === 'both')
}

function initialsFromName(name) {
  const safe = String(name || 'Provider').trim()
  const parts = safe.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || 'P'
}

export function TechnicianCard({ technician, className }) {
  const displayName = technician.displayName ?? technician.display_name ?? 'Service provider'
  const locationText = technician.locationText ?? technician.location_text ?? ''
  const isVerified = technician.isVerified ?? technician.is_verified ?? false
  const ratingAvg = Number(technician.ratingAvg ?? technician.rating_avg ?? 0)
  const ratingCount = technician.ratingCount ?? technician.rating_count ?? 0
  const serviceMode = technician.serviceMode ?? technician.service_mode ?? 'both'
  const rawSpecs = technician.specializations
  const specs = Array.isArray(rawSpecs) ? rawSpecs : []
  const bannerUrl = technician.bannerUrl ?? technician.banner_url

  const modeMeta = serviceModeMeta(serviceMode)
  const modeLabel = modeMeta?.label ?? 'Service mode'

  return (
    <Card
      className={cn(
        'h-full overflow-hidden border-slate-200/80 bg-white/95 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900/95 dark:hover:shadow-slate-950/60',
        className,
      )}
    >
      <Link
        to={`/services/${technician.id}`}
        className="flex h-full flex-col rounded-xl outline-none ring-offset-2 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 dark:ring-offset-slate-950"
        aria-label={`View profile: ${displayName}`}
      >
        <div className="relative aspect-[21/9] w-full shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800">
          {bannerUrl ? (
            <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-2xl font-bold text-slate-500 dark:from-slate-800 dark:to-slate-900 dark:text-slate-400">
              {initialsFromName(displayName)}
            </div>
          )}
        </div>

        <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 flex-1 text-lg font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
              {displayName}
            </h3>
            {isVerified ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800 dark:bg-brand-500/15 dark:text-brand-300">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                Verified
              </span>
            ) : null}
          </div>

          {specs.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Specializations">
              {specs.map((s) => (
                <li
                  key={String(s)}
                  className="rounded-md border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300"
                >
                  {specLabel(s)}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{locationText || 'Location not set'}</span>
            </span>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/35 dark:text-amber-400">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
              {ratingAvg.toFixed(1)}
              <span className="font-normal text-slate-600 dark:text-slate-400">({ratingCount} reviews)</span>
            </span>

            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400" title={modeLabel}>
              {serviceMode === 'mobile' ? (
                <Truck className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
              ) : serviceMode === 'workshop' ? (
                <Building2 className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
              ) : (
                <>
                  <Truck className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
                  <Building2 className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
                </>
              )}
              <span className="sr-only">Service mode: </span>
              <span className="max-w-[10rem] truncate">{modeLabel}</span>
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
