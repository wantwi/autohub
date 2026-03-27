import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter, MapPin, Search, Star, Wrench } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { normalizeList } from '@/lib/normalize'
import { SPECIALIZATIONS, SERVICE_MODES } from '@/lib/constants'
import { TechnicianCard } from '@/components/TechnicianCard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12
const SEARCH_DEBOUNCE_MS = 320

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export function TechniciansPage() {
  const [page, setPage] = useState(1)
  const [specialization, setSpecialization] = useState('')
  const [serviceMode, setServiceMode] = useState('')
  const [searchText, setSearchText] = useState('')
  const debouncedQ = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS)

  const queryPath = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    })
    if (specialization) params.set('specialization', specialization)
    if (serviceMode) params.set('serviceMode', serviceMode)
    const q = debouncedQ.trim()
    if (q) params.set('q', q)
    return `/technicians?${params.toString()}`
  }, [page, specialization, serviceMode, debouncedQ])

  const q = useQuery({
    queryKey: ['technicians', 'directory', page, PAGE_SIZE, specialization, serviceMode, debouncedQ],
    queryFn: () => apiJson(queryPath),
  })

  const { items } = normalizeList(q.data)
  const hasNextPage = items.length === PAGE_SIZE
  const hasPrevPage = page > 1

  function toggleSpecialization(value) {
    setPage(1)
    setSpecialization((prev) => (prev === value ? '' : value))
  }

  if (q.isLoading) return <LoadingSpinner />
  if (q.isError) {
    return (
      <EmptyState
        title="Could not load service providers"
        description="Check your connection and API URL."
        className="dark:border-slate-700 dark:bg-slate-900/40"
      />
    )
  }

  return (
    <div className="animate-fade-in-up space-y-10 pb-8">
      <header className="border-b border-slate-200/80 pb-8 dark:border-slate-700/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-500/20">
              <Wrench className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Service Providers</h1>
              <p className="mt-2 flex max-w-xl flex-wrap items-center gap-x-1 text-slate-600 dark:text-slate-400">
                <MapPin className="inline h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                <span>Browse verified technicians by specialty, how they work, and location.</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <section
        className="space-y-5 rounded-2xl border border-slate-200/80 bg-white/60 p-5 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/40"
        aria-label="Filters"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Filter className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
            Filters
          </div>
          <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Star className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" aria-hidden />
            Higher ratings appear first
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Specialization</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by specialization">
            {SPECIALIZATIONS.map((s) => {
              const selected = specialization === s.value
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleSpecialization(s.value)}
                  aria-pressed={selected}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200',
                    selected
                      ? 'border-brand-500 bg-brand-600 text-white shadow-sm shadow-brand-500/25 dark:border-brand-400 dark:bg-brand-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800/80',
                  )}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="min-w-[min(100%,14rem)] flex-1">
            <label htmlFor="technicians-service-mode" className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Service mode
            </label>
            <select
              id="technicians-service-mode"
              value={serviceMode}
              onChange={(e) => {
                setPage(1)
                setServiceMode(e.target.value)
              }}
              className={cn(
                'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
              )}
            >
              <option value="">All modes</option>
              {SERVICE_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 flex-[2]">
            <label htmlFor="technicians-search" className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-hidden
              />
              <Input
                id="technicians-search"
                placeholder="Name or area…"
                value={searchText}
                onChange={(e) => {
                  setPage(1)
                  setSearchText(e.target.value)
                }}
                className="h-11 border-slate-200 bg-white pl-10 shadow-sm transition-shadow focus-visible:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900"
                aria-label="Search service providers"
              />
            </div>
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No service providers match"
          description="Try different filters or search terms."
          className="dark:border-slate-700 dark:bg-slate-900/40"
        />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((tech, idx) => (
              <div
                key={tech.id}
                className={cn('group animate-fade-in-up')}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="h-full transition-all duration-300 group-hover:-translate-y-0.5">
                  <TechnicianCard technician={tech} />
                </div>
              </div>
            ))}
          </div>

          <nav
            className="flex flex-col items-stretch justify-between gap-4 border-t border-slate-200/80 pt-8 sm:flex-row sm:items-center dark:border-slate-700/80"
            aria-label="Pagination"
          >
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Page <span className="font-semibold text-slate-900 dark:text-slate-100">{page}</span>
              {items.length > 0 ? (
                <span className="text-slate-500 dark:text-slate-500">
                  {' '}
                  · {items.length} result{items.length === 1 ? '' : 's'}
                </span>
              ) : null}
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={!hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button type="button" variant="outline" disabled={!hasNextPage} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </nav>
        </>
      )}
    </div>
  )
}
