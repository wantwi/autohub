import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { MapPin, Wrench } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { SPECIALIZATIONS, SERVICE_MODES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LocationPicker } from '@/components/LocationPicker'
import { ImageUploader } from '@/components/ImageUploader'
import { toast } from 'sonner'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const schema = yup.object({
  displayName: yup.string().required('Display name is required'),
  phoneBusiness: yup.string(),
  description: yup.string(),
  locationText: yup.string().required('Location is required'),
  lat: yup.string(),
  lng: yup.string(),
  serviceMode: yup.string().oneOf(['mobile', 'workshop', 'both']).required(),
})

export function TechnicianRegisterPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [bannerImages, setBannerImages] = useState([])
  const [specs, setSpecs] = useState([])

  const statusQ = useQuery({
    queryKey: ['technician', 'register', 'status'],
    queryFn: () => apiJson('/technicians/register/status'),
  })

  const m = useMutation({
    mutationFn: (body) => apiJson('/technicians/register', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Application submitted. Your technician profile is pending approval.')
      qc.invalidateQueries({ queryKey: ['technician', 'register', 'status'] })
      navigate('/technician/register')
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
    defaultValues: {
      displayName: '',
      phoneBusiness: '',
      description: '',
      locationText: '',
      lat: '',
      lng: '',
      serviceMode: 'both',
    },
  })

  const lat = watch('lat')
  const lng = watch('lng')
  const locationText = watch('locationText')
  const onboardingStatus = statusQ.data?.onboardingStatus ?? statusQ.data?.onboarding_status ?? null
  const isRejected = onboardingStatus === 'rejected'
  const isPending = onboardingStatus === 'pending'

  function toggleSpec(value) {
    setSpecs((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-8 pb-2">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md">
        <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 px-6 py-8 text-white">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Wrench className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Become a service provider</h1>
              <p className="mt-2 max-w-lg text-sm text-brand-100">
                Apply to list your services on AutoHub. Approved technicians appear in search and receive booking requests.
              </p>
            </div>
          </div>
        </div>
      </section>

      {statusQ.data && (
        <section
          className={`rounded-xl border px-4 py-3 text-sm ${
            isRejected
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : onboardingStatus === 'approved'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-sky-200 bg-sky-50 text-sky-900'
          }`}
        >
          {onboardingStatus === 'approved'
            ? 'Your application was approved. Open your technician dashboard from the menu.'
            : isRejected
              ? 'Your previous application was rejected. Contact support or wait for further instructions.'
              : 'Your application is pending admin review.'}
        </section>
      )}

      <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-lg">Technician profile</CardTitle>
              <CardDescription>Details appear on your public profile after approval.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-6">
          <form
            className="space-y-5"
            onSubmit={handleSubmit((vals) => {
              if (specs.length === 0) {
                toast.error('Select at least one specialization')
                return
              }
              const bannerUrl = bannerImages[0] || undefined
              m.mutate({
                displayName: vals.displayName,
                phoneBusiness: vals.phoneBusiness || null,
                description: vals.description || null,
                locationText: vals.locationText,
                lat: vals.lat ? Number(vals.lat) : undefined,
                lng: vals.lng ? Number(vals.lng) : undefined,
                serviceMode: vals.serviceMode,
                specializations: specs,
                bannerUrl: bannerUrl || null,
              })
            })}
          >
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input {...register('displayName')} />
              {errors.displayName ? <p className="text-sm text-red-600">{errors.displayName.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Business phone (optional)</Label>
              <Input {...register('phoneBusiness')} />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="min-h-[88px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                {...register('description')}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Specializations</p>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleSpec(s.value)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      specs.includes(s.value)
                        ? 'border-brand-500 bg-brand-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Service mode</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                {...register('serviceMode')}
              >
                {SERVICE_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
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

            <div className="space-y-2">
              <Label>Banner image (optional)</Label>
              <ImageUploader value={bannerImages} onChange={setBannerImages} maxFiles={1} />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={m.isPending || !!statusQ.data || statusQ.isLoading}
                size="lg"
                className="w-full shadow-lg shadow-brand-500/20 sm:w-auto"
              >
                {statusQ.data ? 'Application already submitted' : m.isPending ? 'Submitting…' : 'Submit application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
