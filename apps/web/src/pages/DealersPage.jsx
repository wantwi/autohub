import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Store, Search } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { normalizeList } from '@/lib/normalize'
import { DealerCard } from '@/components/DealerCard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function DealersPage() {
  const [filter, setFilter] = useState('')
  const q = useQuery({
    queryKey: ['dealers', 'all'],
    queryFn: () => apiJson('/dealers'),
  })
  const { items } = normalizeList(q.data)

  const filtered = useMemo(() => {
    const t = filter.trim().toLowerCase()
    if (!t) return items
    return items.filter(
      (d) =>
        String((d.shopName ?? d.shop_name) || '').toLowerCase().includes(t) ||
        String((d.locationText ?? d.location_text) || '').toLowerCase().includes(t),
    )
  }, [items, filter])

  if (q.isLoading) return <LoadingSpinner />
  if (q.isError) {
    return <EmptyState title="Could not load dealers" description="Check your connection and API URL." />
  }

  return (
    <div className="animate-fade-in-up space-y-10 pb-8">
      <header className="border-b border-slate-200/80 pb-8 dark:border-slate-700/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-500/20">
              <Store className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Dealers</h1>
              <p className="mt-2 max-w-xl text-slate-600 dark:text-slate-400">
                Verified shops with trusted profiles, ratings, and contact details.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden />
        <Input
          placeholder="Filter by name or area…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-11 border-slate-200 bg-white pl-10 shadow-sm transition-shadow focus-visible:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900"
          aria-label="Filter dealers"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No dealers match" description="Try a different search." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d, idx) => (
            <div
              key={d.id}
              className={cn('group animate-fade-in-up')}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="h-full transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
                <DealerCard dealer={d} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
