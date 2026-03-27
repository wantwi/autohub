import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { cn } from '@/lib/utils'

const conditionVariant = {
  new: 'brand',
  used: 'secondary',
  refurbished: 'warning',
}

const conditionLabel = {
  new: 'New',
  used: 'Used',
  refurbished: 'Refurbished',
}

export function PartCard({ part, className }) {
  const img = part.images?.[0]
  const d = part.dealer || {}
  const dealerName = d.shopName ?? d.shop_name ?? part.dealerShopName ?? part.dealer_shop_name ?? 'Dealer'
  const isVerified = d.isVerified ?? d.is_verified ?? part.dealerIsVerified ?? part.dealer_is_verified ?? false
  const rating = d.ratingAvg ?? d.rating_avg ?? part.dealerRatingAvg ?? part.dealer_rating_avg

  return (
    <Card
      className={cn(
        'group h-full overflow-hidden border-slate-200/60 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:shadow-slate-900/50',
        className,
      )}
    >
      <Link to={`/parts/${part.id}`} className="flex h-full flex-col">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          {img ? (
            <img
              src={img}
              alt={part.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400 dark:text-slate-500">No photo</div>
          )}
          <div className="absolute right-2 top-2">
            <Badge variant={conditionVariant[part.condition] || 'secondary'} className="shadow-sm">
              {conditionLabel[part.condition] || part.condition}
            </Badge>
          </div>
        </div>
        <CardContent className="flex flex-1 flex-col space-y-2.5 p-4">
          <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-slate-700 transition-colors dark:text-slate-100 dark:group-hover:text-slate-300">
            {part.name}
          </h3>

          <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            GHS {Number(part.price).toLocaleString()}
          </p>

          <div className="mt-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate font-medium">{dealerName}</span>
            {isVerified && <VerifiedBadge className="shrink-0" />}
            {rating ? (
              <span className="ml-auto flex shrink-0 items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                <Star className="h-3 w-3 fill-current" />
                {Number(rating).toFixed(1)}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
