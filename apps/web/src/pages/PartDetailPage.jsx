import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Lock, MapPin, MessageSquare, Package, Phone, Star, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { apiJson } from '@/lib/api'
import { normalizeList } from '@/lib/normalize'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { PartCard } from '@/components/PartCard'
import { cn } from '@/lib/utils'

export function PartDetailPage() {
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [imageIndex, setImageIndex] = useState(0)

  const partQ = useQuery({
    queryKey: ['part', id],
    queryFn: () => apiJson(`/parts/${id}`),
    enabled: !!id,
  })

  const compareQ = useQuery({
    queryKey: ['part', id, 'compare'],
    queryFn: () => apiJson(`/parts/${id}/compare`),
    enabled: !!id,
  })

  const messageMut = useMutation({
    mutationFn: (body) =>
      apiJson('/conversations', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (conv) => navigate(`/messages/${conv.id}`),
    onError: (e) => toast.error(e.message),
  })

  const part = partQ.data
  const { items: others } = normalizeList(compareQ.data)

  if (partQ.isLoading) return <LoadingSpinner />
  if (partQ.isError || !part) {
    return <EmptyState title="Part not found" actionLabel="Back to search" actionTo="/search" />
  }

  const dealer = {
    id: part.dealerId ?? part.dealer_id,
    shopName: part.dealerShopName ?? part.dealer_shop_name ?? 'Dealer',
    isVerified: part.dealerIsVerified ?? part.dealer_is_verified ?? false,
    ratingAvg: part.dealerRatingAvg ?? part.dealer_rating_avg ?? null,
    ratingCount: part.dealerRatingCount ?? part.dealer_rating_count ?? 0,
    locationText: part.dealerLocationText ?? part.dealer_location_text ?? '',
    phoneBusiness: part.dealerPhoneBusiness ?? part.dealer_phone_business ?? '',
  }
  const images = Array.isArray(part.images) ? part.images : []
  const mainSrc = images[imageIndex] ?? images[0]

  const phoneDigits = dealer.phoneBusiness.replace(/[^0-9+]/g, '')

  return (
    <div className="animate-fade-in-up space-y-12 pb-10">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-4">
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-md transition-shadow duration-300 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="aspect-square">
              {mainSrc ? (
                <img
                  src={mainSrc}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                  <Package className="h-14 w-14 opacity-40" aria-hidden />
                  <span className="text-sm font-medium">No image</span>
                </div>
              )}
            </div>
          </div>
          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, idx) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setImageIndex(idx)}
                  className={cn(
                    'relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200',
                    idx === imageIndex
                      ? 'border-brand-600 ring-2 ring-brand-500/30'
                      : 'border-transparent opacity-80 hover:border-slate-300 hover:opacity-100 dark:hover:border-slate-600',
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="animate-fade-in-up flex flex-col gap-6" style={{ animationDelay: '80ms' }}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{part.name}</h1>
            {part.description ? (
              <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-400">{part.description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {part.category ? <Badge className="rounded-lg px-2.5 py-0.5">{part.category}</Badge> : null}
            {part.condition ? (
              <Badge variant="secondary" className="rounded-lg px-2.5 py-0.5 capitalize">
                {part.condition}
              </Badge>
            ) : null}
          </div>
          <p className="text-3xl font-bold tracking-tight text-brand-700 dark:text-brand-400">
            GHS {Number(part.price).toLocaleString()}
          </p>

          <Card className="border-slate-200/80 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Sold by</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/dealers/${dealer.id}`}
                  className="text-lg font-semibold text-slate-900 underline-offset-4 transition-colors hover:text-brand-700 hover:underline dark:text-slate-100 dark:hover:text-brand-400"
                >
                  {dealer.shopName}
                </Link>
                {dealer.isVerified ? <VerifiedBadge /> : null}
              </div>

              {user ? (
                <>
                  {dealer.locationText ? (
                    <p className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                      {dealer.locationText}
                    </p>
                  ) : null}

                  {dealer.phoneBusiness ? (
                    <p className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                      <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                      <a href={`tel:${phoneDigits}`} className="underline-offset-2 hover:text-brand-700 hover:underline dark:hover:text-brand-400">
                        {dealer.phoneBusiness}
                      </a>
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  Sign in to see contact details
                </p>
              )}

              {dealer.ratingAvg ? (
                <p className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
                  <Star className="h-4 w-4 fill-current" />
                  {Number(dealer.ratingAvg).toFixed(1)}
                  <span className="font-normal text-slate-500">({dealer.ratingCount} reviews)</span>
                </p>
              ) : null}
            </CardContent>
          </Card>

          {user ? (
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                disabled={messageMut.isPending}
                onClick={() => messageMut.mutate({ dealerId: dealer.id, partId: part.id })}
              >
                <MessageSquare className="h-4 w-4" />
                {messageMut.isPending ? 'Opening...' : 'Message dealer'}
              </Button>
              {phoneDigits && (
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <a href={`tel:${phoneDigits}`}>
                    <Phone className="h-4 w-4" />
                    Call dealer
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-center dark:border-slate-700 dark:bg-slate-800/80">
              <Lock className="mx-auto mb-2 h-5 w-5 text-slate-400" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Sign in to contact this dealer</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Create a free account to message, call, or view their location.</p>
              <Button asChild size="sm" className="mt-3 gap-2">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <section className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <Link
          to="/services"
          className="flex items-center gap-4 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-brand-100/60 p-5 transition-all hover:shadow-md dark:border-brand-500/30 dark:from-brand-950/40 dark:to-brand-900/30"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Wrench className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Need help installing this part?</p>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              Browse verified mechanics, electricians, and other service providers near you.
            </p>
          </div>
          <span className="text-sm font-medium text-brand-700 dark:text-brand-400">Find a technician &rarr;</span>
        </Link>
      </section>

      <section className="animate-fade-in-up border-t border-slate-200/80 pt-10 dark:border-slate-700" style={{ animationDelay: '120ms' }}>
        <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-100">Other dealers (compare)</h2>
        {compareQ.isLoading ? <LoadingSpinner /> : null}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {others
            .filter((p) => p.id !== part.id)
            .map((p, idx) => (
              <div
                key={p.id}
                className="group animate-fade-in-up"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="h-full transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
                  <PartCard part={p} />
                </div>
              </div>
            ))}
        </div>
        {compareQ.isSuccess && others.filter((p) => p.id !== part.id).length === 0 ? (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">No other listings matched for comparison yet.</p>
        ) : null}
      </section>
    </div>
  )
}
