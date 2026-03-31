import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { CheckCircle2, Clock, MapPin, Wrench, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { apiJson } from '@/lib/api'
import { SPECIALIZATIONS, SERVICE_MODES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LocationPicker } from '@/components/LocationPicker'
import { cn } from '@/lib/utils'

const schema = yup.object({
  displayName: yup.string().required('Display name is required'),
  phoneBusiness: yup.string(),
  serviceMode: yup.string().oneOf(['mobile', 'workshop', 'both']).default('both'),
  description: yup.string(),
  locationText: yup.string(),
  lat: yup.number().nullable(),
  lng: yup.number().nullable(),
})

const textareaClass =
  'min-h-[88px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'

export function TechnicianRegisterPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedSpecs, setSelectedSpecs] = useState([])

  const statusQ = useQuery({
    queryKey: ['technician', 'register', 'status'],
    queryFn: () => apiJson('/technicians/register/status'),
  })

  const m = useMutation({
    mutationFn: (body) => apiJson('/technicians/register', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Application submitted! You will be notified once approved.')
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
    defaultValues: { displayName: '', phoneBusiness: '', serviceMode: 'both', description: '', locationText: '', lat: null, lng: null },
  })

  const lat = watch('lat')
  const lng = watch('lng')
  const locationText = watch('locationText')

  const status = statusQ.data?.data
  const onboardingStatus = status?.onboardingStatus ?? status?.onboarding_status ?? null
  const isPending = onboardingStatus === 'pending'
  const isRejected = onboardingStatus === 'rejected'
  const isApproved = onboardingStatus === 'approved'

  function toggleSpec(value) {
    setSelectedSpecs((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    )
  }

  const onSubmit = (vals) => {
    if (selectedSpecs.length === 0) {
      toast.error('Please select at least one specialization.')
      return
    }
    m.mutate({
      displayName: vals.displayName,
      phoneBusiness: vals.phoneBusiness || undefined,
      specializations: selectedSpecs,
      serviceMode: vals.serviceMode || 'both',
      description: vals.description || undefined,
      locationText: vals.locationText || undefined,
      lat: vals.lat ? Number(vals.lat) : undefined,
      lng: vals.lng ? Number(vals.lng) : undefined,
    })
  }

  if (isApproved) {
    return (
      <div className="animate-fade-in-up mx-auto max-w-lg py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-4 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">You're a Technician!</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Your application was approved. Head to your dashboard to manage requests.</p>
        <Button className="mt-6" onClick={() => navigate('/technician/dashboard')}>Go to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-8 pb-2">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900">
        <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 px-6 py-8 text-white">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Wrench className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Register as a Technician</h1>
              <p className="mt-2 max-w-lg text-sm text-brand-100">
                Submit your application to offer automotive services on AutoHub Ghana.
                Once approved, you'll appear in search and receive booking requests.
              </p>
            </div>
          </div>
        </div>
      </section>

      {isPending && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800/40 dark:bg-sky-900/20 dark:text-sky-300">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Your application is pending admin review. You can update and resubmit your details if needed.</span>
        </div>
      )}
      {isRejected && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Your previous application was not approved. Update your details and resubmit.</span>
        </div>
      )}

      <Card className="border-slate-200/80 shadow-sm dark:border-slate-700">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 dark:border-slate-800 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
              <Wrench className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-lg">Your profile</CardTitle>
              <CardDescription>This information appears on your public technician listing.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label>Display name <span className="text-red-500">*</span></Label>
              <Input {...register('displayName')} placeholder="e.g. Kwame Auto Services" />
              {errors.displayName && <p className="text-sm text-red-600">{errors.displayName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Business phone</Label>
              <Input {...register('phoneBusiness')} placeholder="e.g. 0244000000" />
            </div>

            <div className="space-y-3">
              <Label>Specializations <span className="text-red-500">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map((s) => {
                  const sel = selectedSpecs.includes(s.value)
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => toggleSpec(s.value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
                        sel
                          ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
                      )}
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>
              {selectedSpecs.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">Select at least one specialization.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Service mode</Label>
              <select
                {...register('serviceMode')}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {SERVICE_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                {...register('description')}
                placeholder="Describe your services, experience, and what makes you stand out…"
                className={textareaClass}
              />
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-4 dark:border-slate-700 dark:bg-slate-800/30">
              <Label className="mb-3 block">
                <MapPin className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />
                Location
              </Label>
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

            <div className="pt-2">
              <Button type="submit" disabled={m.isPending} size="lg" className="w-full shadow-lg shadow-brand-500/20 sm:w-auto">
                {m.isPending
                  ? 'Submitting…'
                  : isRejected
                  ? 'Resubmit application'
                  : isPending
                  ? 'Update application'
                  : 'Submit application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
