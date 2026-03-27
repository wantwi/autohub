import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Package, Truck } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { normalizeList } from '@/lib/normalize'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

function normStatus(value) {
  return String(value || '').toLowerCase()
}

export function DealerOrdersPage() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['dealer', 'me', 'orders'],
    queryFn: () => apiJson('/dealers/me/orders'),
  })

  const confirmM = useMutation({
    mutationFn: (oid) => apiJson(`/orders/${oid}/confirm`, { method: 'PATCH' }),
    onSuccess: () => {
      toast.success('Order confirmed')
      qc.invalidateQueries({ queryKey: ['dealer', 'me', 'orders'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const dispatchM = useMutation({
    mutationFn: (oid) => apiJson(`/orders/${oid}/dispatch`, { method: 'PATCH' }),
    onSuccess: () => {
      toast.success('Marked dispatched')
      qc.invalidateQueries({ queryKey: ['dealer', 'me', 'orders'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const cancelM = useMutation({
    mutationFn: (oid) => apiJson(`/orders/${oid}/cancel`, { method: 'PATCH' }),
    onSuccess: () => {
      toast.success('Order cancelled')
      qc.invalidateQueries({ queryKey: ['dealer', 'me', 'orders'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const { items } = normalizeList(q.data)

  const pending = useMemo(() => items.filter((o) => normStatus(o.status) === 'pending'), [items])
  const confirmed = useMemo(() => items.filter((o) => normStatus(o.status) === 'confirmed'), [items])
  const other = useMemo(
    () => items.filter((o) => !['pending', 'confirmed'].includes(normStatus(o.status))),
    [items],
  )

  if (q.isLoading) return <LoadingSpinner />
  if (q.isError) {
    return <EmptyState title="Could not load orders" description={q.error?.message} />
  }

  if (items.length === 0) {
    return <EmptyState title="No orders yet" description="Incoming dealer orders will appear here." />
  }

  return (
    <div className="animate-fade-in-up space-y-10 pb-2">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-600">Dealer</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Incoming orders</h1>
          <p className="max-w-xl text-slate-600">Prioritize pending confirmations to meet the 2-hour SLA.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
          <Package className="h-4 w-4 text-brand-600" aria-hidden />
          <span className="tabular-nums">{items.length}</span> total
        </span>
      </div>

      {pending.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-800">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="text-lg font-semibold text-slate-900">Needs confirmation ({pending.length})</h2>
          </div>
          <div className="space-y-3">
            {pending.map((o, i) => {
              const confirmPending = confirmM.isPending && confirmM.variables === o.id
              const cancelPending = cancelM.isPending && cancelM.variables === o.id
              return (
                <Card
                  key={o.id}
                  className="animate-fade-in-up border-amber-200/70 bg-gradient-to-b from-amber-50/60 to-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-base font-semibold text-slate-900">{o.reference || o.id}</p>
                        <p className="text-sm text-slate-600">
                          GHS <span className="font-semibold tabular-nums text-slate-900">{Number(o.total_amount).toLocaleString()}</span>
                        </p>
                        <p className="text-xs font-medium text-amber-800">Confirm within 2 hours (pilot SLA)</p>
                        <p className="text-sm text-slate-600">
                          Buyer phone:{' '}
                          <span className="font-medium text-slate-900">
                            {o.buyer_phone_visible ? o.buyer_phone || o.buyer?.phone : '••••••••'}
                          </span>
                        </p>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-amber-100/80 pt-4">
                      <Button type="button" size="sm" className="shadow-sm" disabled={confirmPending || cancelPending} onClick={() => confirmM.mutate(o.id)}>
                        Confirm
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="shadow-sm"
                        disabled={confirmPending || cancelPending}
                        onClick={() => cancelM.mutate(o.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      ) : null}

      {confirmed.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-800">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="text-lg font-semibold text-slate-900">Ready to dispatch ({confirmed.length})</h2>
          </div>
          <div className="space-y-3">
            {confirmed.map((o, i) => {
              const dispatchPending = dispatchM.isPending && dispatchM.variables === o.id
              return (
                <Card
                  key={o.id}
                  className="animate-fade-in-up border-brand-200/70 bg-gradient-to-b from-brand-50/50 to-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-base font-semibold text-slate-900">{o.reference || o.id}</p>
                        <p className="text-sm text-slate-600">
                          GHS <span className="font-semibold tabular-nums text-slate-900">{Number(o.total_amount).toLocaleString()}</span>
                        </p>
                        <p className="text-sm text-slate-600">
                          Buyer phone:{' '}
                          <span className="font-medium text-slate-900">
                            {o.buyer_phone_visible ? o.buyer_phone || o.buyer?.phone : '••••••••'}
                          </span>
                        </p>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-4 border-t border-brand-100/80 pt-4">
                      <Button type="button" size="sm" className="gap-1.5 shadow-sm" disabled={dispatchPending} onClick={() => dispatchM.mutate(o.id)}>
                        <Truck className="h-4 w-4" aria-hidden />
                        Mark dispatched
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      ) : null}

      {other.length > 0 ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
            <p className="text-sm text-slate-500">Shipped, delivered, and completed orders.</p>
          </div>
          <div className="space-y-3">
            {other.map((o, i) => (
              <Card
                key={o.id}
                className="animate-fade-in-up border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{o.reference || o.id}</p>
                    <p className="text-sm text-slate-600">
                      GHS <span className="font-semibold tabular-nums">{Number(o.total_amount).toLocaleString()}</span>
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
