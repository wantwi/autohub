import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { MapPin, Store } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LocationPicker } from '@/components/LocationPicker'
import { toast } from 'sonner'

const schema = yup.object({
  shopName: yup.string().required('Shop name is required'),
  phoneBusiness: yup.string().required('Business phone is required'),
  description: yup.string(),
  locationText: yup.string().required('Location is required'),
  lat: yup.string(),
  lng: yup.string(),
})

export function DealerRegisterPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const statusQ = useQuery({
    queryKey: ['dealer', 'register', 'status'],
    queryFn: () => apiJson('/dealers/register/status'),
  })
  const m = useMutation({
    mutationFn: (body) => apiJson('/dealers/register', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Application submitted. Your dealer profile is pending approval.')
      qc.invalidateQueries({ queryKey: ['dealer', 'register', 'status'] })
      navigate('/dealer/register')
    },
    onError: (e) => toast.error(e.message),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { shopName: '', phoneBusiness: '', description: '', locationText: '', lat: '', lng: '' },
  })

  const lat = watch('lat')
  const lng = watch('lng')
  const locationText = watch('locationText')
  const onboardingStatus = statusQ.data?.onboardingStatus ?? statusQ.data?.onboarding_status ?? null
  const isRejected = onboardingStatus === 'rejected'
  const isPending = onboardingStatus === 'pending'

  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-8 pb-2">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md">
        <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 px-6 py-8 text-white">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Store className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Register your shop</h1>
              <p className="mt-2 max-w-lg text-sm text-brand-100">
                Submit your dealer application. Only approved dealers can upload and publish parts.
              </p>
            </div>
          </div>
        </div>
      </section>
      {(isPending || isRejected) && (
        <section
          className={`rounded-xl border px-4 py-3 text-sm ${
            isRejected
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-sky-200 bg-sky-50 text-sky-900'
          }`}
        >
          {isRejected
            ? 'Your previous application was rejected. Update your profile details and resubmit.'
            : 'Your application is pending admin review. You can still update and resubmit details if needed.'}
        </section>
      )}

      <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-lg">Dealer profile</CardTitle>
              <CardDescription>Details appear on your public shop and in search.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-6">
          <form
            className="space-y-5"
            onSubmit={handleSubmit((vals) =>
              m.mutate({
                shopName: vals.shopName,
                phoneBusiness: vals.phoneBusiness,
                description: vals.description,
                locationText: vals.locationText,
                lat: vals.lat ? Number(vals.lat) : undefined,
                lng: vals.lng ? Number(vals.lng) : undefined,
              }),
            )}
          >
            <div className="space-y-2">
              <Label>Shop name</Label>
              <Input {...register('shopName')} />
              {errors.shopName ? <p className="text-sm text-red-600">{errors.shopName.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Business phone</Label>
              <Input {...register('phoneBusiness')} />
              {errors.phoneBusiness ? <p className="text-sm text-red-600">{errors.phoneBusiness.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Description / specialization</Label>
              <Input {...register('description')} />
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-4">
              <LocationPicker
                lat={lat}
                lng={lng}
                locationText={locationText}
                onLocationText={(t) => setValue('locationText', t)}
                onChange={({ lat: la, lng: ln }) => {
                  if (la !== undefined) setValue('lat', la)
                  if (ln !== undefined) setValue('lng', ln)
                }}
              />
            </div>
            {errors.locationText ? <p className="text-sm text-red-600">{errors.locationText.message}</p> : null}

            <div className="pt-2">
              <Button type="submit" disabled={m.isPending} size="lg" className="w-full shadow-lg shadow-brand-500/20 sm:w-auto">
                {isRejected ? 'Resubmit application' : isPending ? 'Update application' : 'Submit application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
