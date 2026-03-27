import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const OPERATING_DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const DAY_LABELS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

const DAY_LABEL_SHORT = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

export function hoursObjectToRows(obj) {
  const o = obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {}
  return OPERATING_DAY_ORDER.map((key) => {
    const raw = o[key]
    const str = raw != null ? String(raw).trim() : ''
    return {
      key,
      label: DAY_LABELS[key],
      closed: !str,
      hours: str,
    }
  })
}

export function rowsToHoursObject(rows) {
  const out = {}
  for (const r of rows) {
    if (!r.closed && r.hours.trim()) out[r.key] = r.hours.trim()
  }
  return out
}

export function OperatingHoursFields({ rows, onRowsChange, className }) {
  const updateRow = (key, patch) => {
    onRowsChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const markAllClosed = () => {
    onRowsChange(rows.map((r) => ({ ...r, closed: true, hours: '' })))
  }

  const copyMonToWeekdays = () => {
    const mon = rows.find((r) => r.key === 'mon')
    if (!mon || mon.closed || !mon.hours.trim()) return
    const h = mon.hours.trim()
    onRowsChange(
      rows.map((r) =>
        ['tue', 'wed', 'thu', 'fri'].includes(r.key) ? { ...r, closed: false, hours: h } : r,
      ),
    )
  }

  const mon = rows.find((r) => r.key === 'mon')
  const canCopyWeekdays = mon && !mon.closed && !!mon.hours.trim()

  const fieldClass =
    'box-border block h-10 w-full max-w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:ring-offset-slate-900 dark:placeholder:text-slate-500'

  return (
    <div className={cn('flex min-h-0 flex-col gap-4', className)}>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Uncheck <span className="font-medium text-slate-700 dark:text-slate-300">Closed</span> and enter hours (e.g. <span className="font-mono">8am–6pm</span>), or leave days closed.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={markAllClosed}>
          Mark all closed
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={!canCopyWeekdays}
          title={canCopyWeekdays ? undefined : 'Set Monday hours first, with Closed unchecked'}
          onClick={copyMonToWeekdays}
        >
          Copy Mon → Tue–Fri
        </Button>
      </div>

      <ul className="divide-y divide-slate-200 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
        {rows.map((r) => (
          <li
            key={r.key}
            className="grid grid-cols-[auto_auto_minmax(10.5rem,1fr)] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4"
          >
            <span
              className="w-9 shrink-0 text-sm font-semibold text-slate-900 sm:w-10 dark:text-slate-100"
              title={r.label}
            >
              {DAY_LABEL_SHORT[r.key]}
            </span>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={r.closed}
                onChange={(e) => updateRow(r.key, { closed: e.target.checked, hours: e.target.checked ? '' : r.hours })}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-700"
              />
              Closed
            </label>
            <input
              type="text"
              disabled={r.closed}
              value={r.hours}
              onChange={(e) => updateRow(r.key, { hours: e.target.value, closed: e.target.value.trim() ? false : r.closed })}
              placeholder="e.g. 8am–6pm"
              aria-label={`${r.label} hours`}
              className={cn(fieldClass, 'min-w-0', r.closed && 'bg-slate-50 text-slate-400 dark:bg-slate-700/50 dark:text-slate-500')}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
