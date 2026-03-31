import { HandCoins } from 'lucide-react'
import { Link } from 'react-router-dom'

export function OfferBubble({ payload }) {
  if (!payload) return null
  const { partName, originalPrice, offerPrice, partId } = payload

  return (
    <div className="w-full max-w-[280px] overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white shadow-sm dark:border-amber-800/40 dark:from-amber-950/30 dark:to-slate-900">
      <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/60 px-3 py-2 dark:border-amber-900/30 dark:bg-amber-950/40">
        <HandCoins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Price Offer
        </span>
      </div>
      <div className="space-y-2 px-3 py-3">
        {partName && (
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {partId ? (
              <Link to={`/parts/${partId}`} className="hover:text-brand-600 hover:underline dark:hover:text-brand-400">
                {partName}
              </Link>
            ) : (
              partName
            )}
          </p>
        )}
        <div className="flex items-baseline gap-3">
          {originalPrice != null && (
            <span className="text-sm text-slate-400 line-through dark:text-slate-500">
              GHS {Number(originalPrice).toLocaleString()}
            </span>
          )}
          <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
            GHS {Number(offerPrice).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
