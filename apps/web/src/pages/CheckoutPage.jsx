import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiJson } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PaystackButton } from '@/components/PaystackButton'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { toast } from 'sonner'
import { useState } from 'react'
import { Banknote, Package, ShieldCheck, Truck } from 'lucide-react'

export function CheckoutPage() {
  const { partId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [deliveryType, setDeliveryType] = useState('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [payRef, setPayRef] = useState(null)
  const [createdOrderId, setCreatedOrderId] = useState(null)

  const partQ = useQuery({
    queryKey: ['part', partId],
    queryFn: () => apiJson(`/parts/${partId}`),
    enabled: !!partId,
  })

  const preparePayM = useMutation({
    mutationFn: async () => {
      const order = await apiJson('/orders', {
        method: 'POST',
        body: JSON.stringify({
          part_id: part.id,
          quantity: 1,
          delivery_type: deliveryType,
          delivery_address: deliveryType === 'delivery' ? deliveryAddress : undefined,
          notes: notes || undefined,
        }),
      })
      const oid = order?.id ?? order?.order?.id
      const pay = await apiJson('/payments/initialize', {
        method: 'POST',
        body: JSON.stringify({ order_id: oid }),
      })
      return { order, pay, oid }
    },
    onSuccess: ({ pay, oid }) => {
      const authUrl = pay?.authorization_url ?? pay?.authorizationUrl
      const reference = pay?.reference ?? pay?.data?.reference
      if (oid) setCreatedOrderId(oid)
      if (authUrl) {
        window.location.assign(authUrl)
        return
      }
      if (reference) {
        setPayRef(reference)
        toast.success('Order ready — complete payment')
        return
      }
      toast.error('Payment could not be initialized')
    },
    onError: (e) => toast.error(e.message || 'Checkout failed'),
  })

  const part = partQ.data
  const dealer = part?.dealer

  if (partQ.isLoading) return <LoadingSpinner />
  if (partQ.isError || !part) {
    return <EmptyState title="Part unavailable" actionLabel="Search" actionTo="/search" />
  }

  const email = user?.email || `${String(user?.phone || 'buyer').replace(/\W/g, '')}@autohub.gh`
  const total = Number(part.price)
  const amountPesewas = Math.round(total * 100)

  return (
    <div className="animate-fade-in-up mx-auto max-w-lg space-y-8 pb-2">
      <div className="space-y-2 text-center sm:text-left">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-600">Checkout</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Complete purchase</h1>
        <p className="text-slate-600">Review your part, choose delivery, then pay securely.</p>
      </div>

      <Card className="overflow-hidden border-slate-200/80 shadow-md transition-shadow hover:shadow-lg">
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-5 text-white">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <Package className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg font-semibold text-white">Order summary</CardTitle>
              <CardDescription className="text-brand-100">One line item — pilot checkout.</CardDescription>
            </div>
          </div>
        </div>
        <CardContent className="space-y-4 p-6">
          <div>
            <p className="text-base font-semibold text-slate-900">{part.name}</p>
            <p className="mt-2 flex items-baseline gap-1 text-2xl font-bold tabular-nums text-brand-700">
              GHS {total.toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-700">
            <span className="font-medium">{dealer?.shop_name}</span>
            {dealer?.is_verified ? <VerifiedBadge /> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700">
              <Truck className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-lg">Delivery</CardTitle>
              <CardDescription>Pickup at the dealer or request drop-off details.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={deliveryType === 'pickup' ? 'default' : 'outline'}
              className={
                deliveryType === 'pickup'
                  ? 'shadow-md shadow-brand-500/20'
                  : 'border-slate-200 shadow-sm hover:border-brand-200 hover:bg-brand-50/50'
              }
              onClick={() => setDeliveryType('pickup')}
            >
              Pickup
            </Button>
            <Button
              type="button"
              variant={deliveryType === 'delivery' ? 'default' : 'outline'}
              className={
                deliveryType === 'delivery'
                  ? 'shadow-md shadow-brand-500/20'
                  : 'border-slate-200 shadow-sm hover:border-brand-200 hover:bg-brand-50/50'
              }
              onClick={() => setDeliveryType('delivery')}
            >
              Delivery
            </Button>
          </div>
          {deliveryType === 'delivery' ? (
            <div className="space-y-2">
              <Label>Drop-off address</Label>
              <textarea
                className="min-h-[88px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm ring-offset-white transition-shadow placeholder:text-slate-400 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Notes to dealer (optional)</Label>
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm ring-offset-white transition-shadow placeholder:text-slate-400 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/5 text-slate-800">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-lg">Refund policy</CardTitle>
              <CardDescription>Pilot terms for eligible refunds.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-600">
            Refunds are processed within 5 business days to your original payment method when eligible under the pilot policy.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 shadow-inner">
        {!payRef ? (
          <Button
            type="button"
            size="lg"
            className="w-full gap-2 shadow-lg shadow-brand-500/20"
            onClick={() => preparePayM.mutate()}
            disabled={preparePayM.isPending}
          >
            <Banknote className="h-4 w-4" aria-hidden />
            {preparePayM.isPending ? 'Preparing…' : 'Create order & initialize payment'}
          </Button>
        ) : null}
        {payRef ? (
          <PaystackButton
            email={email}
            amountPesewas={amountPesewas}
            reference={payRef}
            metadata={{ order_id: createdOrderId }}
            label="Pay with Paystack"
            onSuccess={() => {
              toast.success('Payment completed')
              navigate('/orders')
            }}
          />
        ) : null}
        <p className="text-center text-xs leading-relaxed text-slate-500">
          If the API returns an authorization URL, you are redirected to Paystack. Otherwise use the popup button after initialize returns a reference.
        </p>
      </div>
    </div>
  )
}
