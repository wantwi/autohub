import { HandCoins } from 'lucide-react'

export function OfferBubble({ payload }) {
  if (!payload) return null

  const { partName, originalPrice, offerPrice, note } = payload

  return (
    <div className="min-w-[220px] max-w-[280px] overflow-hidden rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/25">
      <div className="flex items-center gap-2 border-b border-amber-200/80 bg-amber-100/70 px-3 py-2 dark:border-amber-700/40 dark:bg-amber-800/30">
        <HandCoins className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Price Offer</span>
      </div>
      <div className="space-y-1.5 px-3 py-2.5">
        {partName && (
          <p className="line-clamp-2 text-xs font-medium text-slate-700 dark:text-slate-300">{partName}</p>
        )}
        {originalPrice != null && (
          <p className="text-xs text-slate-400 line-through dark:text-slate-500">
            GHS {Number(originalPrice).toLocaleString()}
          </p>
        )}
        <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
          GHS {Number(offerPrice).toLocaleString()}
        </p>
        {note && (
          <p className="border-t border-amber-100 pt-1.5 text-xs text-slate-600 dark:border-amber-800/30 dark:text-slate-400">
            {note}
          </p>
        )}
      </div>
    </div>
  )
}
