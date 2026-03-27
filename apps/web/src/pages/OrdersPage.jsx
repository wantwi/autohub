import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Receipt } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { normalizeList } from '@/lib/normalize'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'

export function OrdersPage() {
  const q = useQuery({
    queryKey: ['orders', 'me'],
    queryFn: () => apiJson('/orders/me'),
  })
  const { items } = normalizeList(q.data)

  if (q.isLoading) return <LoadingSpinner />
  if (q.isError) {
    return <EmptyState title="Could not load orders" description={q.error?.message} />
  }

  return (
    <div className="animate-fade-in-up space-y-8 pb-2">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-600">Orders</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your orders</h1>
          <p className="max-w-lg text-slate-600">Reference, total, and status for every purchase.</p>
        </div>
        {items.length > 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
            <Receipt className="h-4 w-4 text-brand-600" aria-hidden />
            {items.length} {items.length === 1 ? 'order' : 'orders'}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="animate-fade-in-up rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16">
          <EmptyState title="No orders yet" actionLabel="Search parts" actionTo="/search" />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((o, i) => (
            <Card
              key={o.id}
              className="animate-fade-in-up border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200/70 hover:shadow-md"
              style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}
            >
              <CardContent className="p-0">
                <Link
                  to={`/orders/${o.id}`}
                  className="group flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <span className="truncate group-hover:text-brand-700">{o.reference || o.id}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-brand-600 group-hover:opacity-100" />
                    </p>
                    <p className="text-sm text-slate-600">
                      Total{' '}
                      <span className="font-semibold tabular-nums text-slate-900">GHS {Number(o.total_amount).toLocaleString()}</span>
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
