import { useMemo } from 'react'
import { usePartCategories } from '@/hooks/usePartCategories'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search as SearchIcon } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { normalizeList } from '@/lib/normalize'
import { SearchBar } from '@/components/SearchBar'
import { PartCard } from '@/components/PartCard'
import { EmptyState } from '@/components/EmptyState'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function buildQuery(sp) {
  const params = new URLSearchParams()
  const q = sp.get('q') || ''
  const make = sp.get('make') || ''
  const model = sp.get('model') || ''
  const year = sp.get('year') || ''
  const category = sp.get('category') || ''
  const condition = sp.get('condition') || ''
  const sort = sp.get('sort') || 'price_asc'
  if (q) params.set('q', q)
  if (make) params.set('make', make)
  if (model) params.set('model', model)
  if (year) params.set('year', year)
  if (category) params.set('category', category)
  if (condition) params.set('condition', condition)
  if (sort) params.set('sort', sort)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function summarizeSearch(sp) {
  const parts = []
  const q = sp.get('q')
  const make = sp.get('make')
  const model = sp.get('model')
  const year = sp.get('year')
  if (q) parts.push(q)
  if (make || model || year) {
    const vehicle = [make, model, year].filter(Boolean).join(' ')
    if (vehicle) parts.push(vehicle)
  }
  return parts.length ? parts.join(' · ') : 'All parts'
}

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const qs = useMemo(() => buildQuery(searchParams), [searchParams])
  const summary = useMemo(() => summarizeSearch(searchParams), [searchParams])
  const categoriesQ = usePartCategories()
  const categoryList = Array.isArray(categoriesQ.data) ? categoriesQ.data : []
  const categoryParam = searchParams.get('category') || ''

  const query = useQuery({
    queryKey: ['parts', 'search', qs],
    queryFn: () => apiJson(`/parts${qs}`),
  })

  const { items } = normalizeList(query.data)

  const setSort = (sort) => {
    const next = new URLSearchParams(searchParams)
    next.set('sort', sort)
    setSearchParams(next)
  }

  return (
    <div className="animate-fade-in-up space-y-10 pb-8">
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-slate-900/50 sm:p-6">
        <SearchBar
          key={searchParams.toString()}
          initialQ={searchParams.get('q') || ''}
          initialMake={searchParams.get('make') || ''}
          initialModel={searchParams.get('model') || ''}
          initialYear={searchParams.get('year') || ''}
          onSearch={({ q, make, model, year }) => {
            const next = new URLSearchParams()
            if (q.trim()) next.set('q', q.trim())
            if (make.trim()) next.set('make', make.trim())
            if (model.trim()) next.set('model', model.trim())
            if (year.trim()) next.set('year', year.trim())
            if (searchParams.get('sort')) next.set('sort', searchParams.get('sort'))
            setSearchParams(next)
          }}
        />
      </div>

      <header className="flex flex-col gap-2 border-b border-slate-200/80 pb-6 dark:border-slate-700/80 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
            <SearchIcon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Search results</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Showing matches for{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{summary}</span>
            </p>
          </div>
        </div>
      </header>

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-slate-900/50 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:max-w-xl">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Category</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-all hover:border-slate-300 focus-visible:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-slate-900/50 dark:hover:border-slate-600 dark:focus-visible:border-slate-500 dark:focus-visible:ring-slate-100/15"
                disabled={categoriesQ.isLoading}
                value={categoryParam}
                onChange={(e) => {
                  const next = new URLSearchParams(searchParams)
                  if (e.target.value) next.set('category', e.target.value)
                  else next.delete('category')
                  setSearchParams(next)
                }}
              >
                <option value="">All categories</option>
                {categoryParam && !categoryList.includes(categoryParam) ? (
                  <option value={categoryParam}>{categoryParam} (legacy)</option>
                ) : null}
                {categoryList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Condition</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition-all hover:border-slate-300 focus-visible:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-slate-900/50 dark:hover:border-slate-600 dark:focus-visible:border-slate-500 dark:focus-visible:ring-slate-100/15"
                value={searchParams.get('condition') || ''}
                onChange={(e) => {
                  const next = new URLSearchParams(searchParams)
                  if (e.target.value) next.set('condition', e.target.value)
                  else next.delete('condition')
                  setSearchParams(next)
                }}
              >
                <option value="">Any</option>
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={searchParams.get('sort') === 'price_asc' ? 'brand' : 'outline'}
              size="sm"
              onClick={() => setSort('price_asc')}
            >
              Price ↑
            </Button>
            <Button
              type="button"
              variant={searchParams.get('sort') === 'price_desc' ? 'brand' : 'outline'}
              size="sm"
              onClick={() => setSort('price_desc')}
            >
              Price ↓
            </Button>
            <Button
              type="button"
              variant={searchParams.get('sort') === 'rating_desc' ? 'brand' : 'outline'}
              size="sm"
              onClick={() => setSort('rating_desc')}
            >
              Rating
            </Button>
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {query.isError ? (
        <EmptyState title="Search failed" description={(query.error && query.error.message) || 'Try again.'} />
      ) : null}

      {query.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No parts found"
          description="Try another keyword, clear filters, or browse dealers directly."
          actionLabel="Browse dealers"
          actionTo="/dealers"
        />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, idx) => (
          <div
            key={p.id}
            className={cn('group animate-fade-in-up')}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <div className="h-full transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
              <PartCard part={p} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
