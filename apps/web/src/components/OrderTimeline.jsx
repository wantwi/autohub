import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'completed', label: 'Completed' },
]

function stepIndex(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'cancelled') return -1
  const i = STEPS.findIndex((x) => x.key === s)
  return i >= 0 ? i : 0
}

export function OrderTimeline({ status }) {
  const idx = stepIndex(status)
  if (String(status || '').toLowerCase() === 'cancelled') {
    return <p className="text-sm text-red-700">This order was cancelled.</p>
  }
  return (
    <ol className="flex flex-wrap gap-2">
      {STEPS.map((step, i) => {
        const done = i <= idx
        return (
          <li
            key={step.key}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              done ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500',
            )}
          >
            {step.label}
          </li>
        )
      })}
    </ol>
  )
}
