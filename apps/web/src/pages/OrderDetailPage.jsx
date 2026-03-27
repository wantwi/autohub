import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/lib/api'
import { getEnv } from '@/lib/env'
import { OrderTimeline } from '@/components/OrderTimeline'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { toast } from 'sonner'
import { CreditCard, MapPin, MessageCircle, Route, Star } from 'lucide-react'

const reviewSchema = yup.object({
  rating: yup.number().min(1).max(5).required(),
  comment: yup.string().max(2000),
})

export function OrderDetailPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const mapsKey = getEnv().googleMapsApiKey

  const orderQ = useQuery({
    queryKey: ['order', id],
    queryFn: () => apiJson(`/orders/${id}`),
    enabled: !!id,
  })

  const cancelM = useMutation({
    mutationFn: () => apiJson(`/orders/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: () => {
      toast.success('Order cancelled')
      qc.invalidateQueries({ queryKey: ['order', id] })
    },
    onError: (e) => toast.error(e.message),
  })

  const reviewM = useMutation({
    mutationFn: (body) => apiJson(`/orders/${id}/review`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Thanks for your review')
      qc.invalidateQueries({ queryKey: ['order', id] })
    },
    onError: (e) => toast.error(e.message),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(reviewSchema),
    defaultValues: { rating: 5, comment: '' },
  })

  const o = orderQ.data
  if (orderQ.isLoading) return <LoadingSpinner />
  if (orderQ.isError || !o) {
    return <EmptyState title="Order not found" actionLabel="Orders" actionTo="/orders" />
  }

  const dealer = o.dealer || {}
  const canReview = ['delivered', 'completed'].includes(String(o.status || '').toLowerCase())

  const waText = encodeURIComponent(
    `Hi, I need a rider for AutoHub order ${o.reference || o.id}. Pickup: ${dealer.location_text || 'dealer'}.`,
  )
  const waHref = `https://wa.me/?text=${waText}`

  const mapSrc =
    dealer.lat != null && dealer.lng != null && mapsKey
      ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(mapsKey)}&q=${encodeURIComponent(`${dealer.lat},${dealer.lng}`)}`
      : null

  return (
    <div className="animate-fade-in-up mx-auto max-w-3xl space-y-8 pb-2">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-600">Order</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{o.reference || o.id}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-800">
              <CreditCard className="h-3.5 w-3.5 text-brand-600" aria-hidden />
              Payment: {o.payment_status}
            </span>
          </p>
        </div>
        <StatusBadge status={o.status} />
      </div>

      <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700">
              <Route className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-lg">Progress</CardTitle>
              <CardDescription>Status updates along your order journey.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
          <OrderTimeline status={o.status} />
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700">
              <MapPin className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-lg">Delivery</CardTitle>
              <CardDescription>How and where this order is fulfilled.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Type: <span className="font-semibold text-slate-900">{o.delivery_type}</span>
          </p>
          {o.delivery_address ? (
            <p className="rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">{o.delivery_address}</p>
          ) : null}
          {mapSrc ? (
            <iframe title="Dealer map" className="h-56 w-full rounded-xl border border-slate-200 shadow-sm" loading="lazy" src={mapSrc} />
          ) : null}
          {dealer.lat != null && dealer.lng != null && !mapSrc ? (
            <a
              className="inline-flex text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
              href={`https://www.google.com/maps?q=${dealer.lat},${dealer.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              Open dealer in Google Maps
            </a>
          ) : null}
          <Button asChild variant="outline" className="gap-2 shadow-sm">
            <a href={waHref} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              WhatsApp rider (prefilled)
            </a>
          </Button>
          <p className="text-xs leading-relaxed text-slate-500">Pilot: coordinate pickup or third-party delivery yourself.</p>
        </CardContent>
      </Card>

      {String(o.status).toLowerCase() === 'pending' ? (
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="destructive" className="shadow-sm" onClick={() => cancelM.mutate()} disabled={cancelM.isPending}>
            Cancel order
          </Button>
        </div>
      ) : null}

      {canReview ? (
        <Card className="border-brand-200/60 bg-gradient-to-b from-brand-50/40 to-white shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
                <Star className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <CardTitle className="text-lg">Rate this dealer</CardTitle>
                <CardDescription>Share feedback after a completed delivery.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={handleSubmit((vals) => reviewM.mutate({ rating: vals.rating, comment: vals.comment }))}
            >
              <div className="space-y-2">
                <Label htmlFor="rating">Rating (1–5)</Label>
                <Input id="rating" type="number" min={1} max={5} {...register('rating')} />
                {errors.rating ? <p className="text-sm text-red-600">{errors.rating.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Input id="comment" {...register('comment')} />
              </div>
              <Button type="submit" disabled={reviewM.isPending} className="shadow-md shadow-brand-500/15">
                Submit review
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
