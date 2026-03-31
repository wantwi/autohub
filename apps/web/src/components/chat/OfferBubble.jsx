import { Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

function parsePayload(payload) {
  if (!payload) return null
  if (typeof payload === 'object') return payload
  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

export function OfferBubble({ payload, className }) {
  const p = parsePayload(payload)
  if (!p?.partName) return null
  const orig = Number(p.originalPrice)
  const off = Number(p.offerPrice)
  return (
    <div
      className={cn(
        '-mx-2.5 -mt-1.5 max-w-[280px] overflow-hidden rounded-lg border-2 border-amber-400/80 bg-gradient-to-br from-amber-50 to-orange-50/90 shadow-sm dark:border-amber-500/50 dark:from-amber-950/50 dark:to-orange-950/40',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-amber-200/80 bg-amber-500/10 px-3 py-2 dark:border-amber-800/60 dark:bg-amber-900/20">
        <Tag className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
        <span className="text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">Price offer</span>
      </div>
      <div className="space-y-1.5 px-3 py-2.5">
        <p className="text-[13px] font-semibold leading-snug text-slate-900 dark:text-slate-100">{p.partName}</p>
        <div className="flex flex-wrap items-baseline gap-2">
          {Number.isFinite(orig) ? (
            <span className="text-sm text-slate-500 line-through dark:text-slate-400">GHS {orig.toLocaleString()}</span>
          ) : null}
          {Number.isFinite(off) ? (
            <span className="text-lg font-bold text-amber-800 dark:text-amber-300">GHS {off.toLocaleString()}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
