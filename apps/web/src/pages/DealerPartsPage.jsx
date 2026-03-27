import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, LayoutGrid, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiJson } from '@/lib/api'
import { normalizeList } from '@/lib/normalize'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'

function getApiCode(error) {
  return error?.payload?.error?.code
}

export function DealerPartsPage() {
  const qc = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const q = useQuery({
    queryKey: ['dealer', 'me', 'parts'],
    queryFn: () => apiJson('/dealers/me/parts'),
  })

  const toggleM = useMutation({
    mutationFn: (id) => apiJson(`/dealers/me/parts/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dealer', 'me', 'parts'] })
      toast.success('Listing visibility updated')
    },
    onError: (e) => toast.error(e.message || 'Could not update visibility'),
  })

  const delM = useMutation({
    mutationFn: (id) => apiJson(`/dealers/me/parts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dealer', 'me', 'parts'] })
      toast.success('Listing removed')
    },
    onError: (e) => toast.error(e.message || 'Could not delete listing'),
  })

  const { items } = normalizeList(q.data)
  const filteredItems = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase()
    if (!needle) return items
    return items.filter((p) => String(p.name || '').toLowerCase().includes(needle))
  }, [items, searchQuery])

  if (q.isLoading) return <LoadingSpinner />
  if (q.isError) {
    const code = getApiCode(q.error)
    return (
      <EmptyState
        title={code === 'DEALER_NOT_APPROVED' ? 'Application pending approval' : 'Cannot load parts'}
        description={
          code === 'DEALER_NOT_APPROVED'
            ? 'Only approved dealers can manage listings. Check your application status.'
            : 'Ensure you are registered as a dealer.'
        }
        actionLabel={code === 'DEALER_NOT_APPROVED' ? 'View application' : 'Register'}
        actionTo="/dealer/register"
      />
    )
  }

  return (
    <div className="animate-fade-in-up space-y-8 pb-2">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md transition-shadow hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 px-6 py-8 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <LayoutGrid className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">My listings</h1>
                <p className="mt-2 max-w-xl text-sm text-slate-200">
                  View, edit, show or hide from buyers, or remove listings. Hidden parts stay in your account but do not appear in search or on your public shop.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0 gap-1.5 shadow-lg shadow-brand-900/30">
              <Link to="/dealer/parts/new">
                <Plus className="h-4 w-4" aria-hidden />
                New listing
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="animate-fade-in rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16 dark:border-slate-700 dark:bg-slate-800/50">
          <EmptyState title="No listings yet" actionLabel="Add part" actionTo="/dealer/parts/new" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-700 dark:bg-slate-800/80">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              <span className="tabular-nums text-slate-900 dark:text-slate-100">{items.length}</span> {items.length === 1 ? 'listing' : 'listings'}
              {searchQuery.trim() ? (
                <span className="ml-2 text-slate-500 dark:text-slate-400">
                  · <span className="tabular-nums text-slate-700 dark:text-slate-300">{filteredItems.length}</span> match{filteredItems.length === 1 ? '' : 'es'}
                </span>
              ) : null}
            </p>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden />
              <Input
                type="search"
                placeholder="Search by part name…"
                className="h-10 border-slate-200 bg-white pl-9 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search listings by name"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3.5 sm:px-6">Part</th>
                  <th className="px-4 py-3.5">Price</th>
                  <th className="px-4 py-3.5">Stock</th>
                  <th className="px-4 py-3.5">Visible to buyers</th>
                  <th className="px-4 py-3.5 text-right sm:pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-600 sm:px-6 dark:text-slate-400">
                      No parts match “{searchQuery.trim()}”.{' '}
                      <button type="button" className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400" onClick={() => setSearchQuery('')}>
                        Clear search
                      </button>
                    </td>
                  </tr>
                ) : null}
                {filteredItems.map((p, i) => {
                  const isLive = Boolean(p.isAvailable ?? p.is_available)
                  const toggling = toggleM.isPending && toggleM.variables === p.id
                  return (
                    <tr
                      key={p.id}
                      className="animate-fade-in-up bg-white transition-colors hover:bg-brand-50/30 dark:bg-slate-900 dark:hover:bg-brand-500/10"
                      style={{ animationDelay: `${Math.min(i, 15) * 40}ms` }}
                    >
                      <td className="px-4 py-4 font-semibold text-slate-900 sm:px-6 dark:text-slate-100">{p.name}</td>
                      <td className="px-4 py-4 tabular-nums text-slate-700 dark:text-slate-300">GHS {Number(p.price).toLocaleString()}</td>
                      <td className="px-4 py-4 tabular-nums text-slate-700 dark:text-slate-300">{p.quantity}</td>
                      <td className="px-4 py-4">
                        <Badge variant={isLive ? 'success' : 'secondary'}>{isLive ? 'Live' : 'Hidden'}</Badge>
                      </td>
                      <td className="px-4 py-4 sm:pr-6">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-9 w-9 shadow-sm transition-shadow hover:shadow"
                            disabled={toggling}
                            title={isLive ? 'Hide from search and dealer profile' : 'Show in search and on your shop'}
                            aria-label={isLive ? 'Hide listing' : 'Show listing'}
                            onClick={() => toggleM.mutate(p.id)}
                          >
                            {isLive ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                          </Button>
                          <Button asChild size="icon" variant="outline" className="h-9 w-9 shadow-sm transition-shadow hover:shadow" title="Edit listing">
                            <Link to={`/dealer/parts/${p.id}/edit`} aria-label={`Edit ${p.name}`}>
                              <Pencil className="h-4 w-4" aria-hidden />
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                            title="Delete listing"
                            aria-label={`Delete ${p.name}`}
                            disabled={delM.isPending && delM.variables === p.id}
                            onClick={() => {
                              if (window.confirm(`Remove “${p.name}” from your listings?`)) delM.mutate(p.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
