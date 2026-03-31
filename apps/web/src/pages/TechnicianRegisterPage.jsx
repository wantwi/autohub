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
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { cn } from '@/lib/utils'

const schema = yup.object({
  displayName: yup.string().required('Display name is required'),
  phoneBusiness: yup.string(),
  description: yup.string(),
  locationText: yup.string().required('Location is required'),
  lat: yup.string(),
  lng: yup.string(),
  serviceMode: yup.string().oneOf(['mobile', 'workshop', 'both']).default('both'),
})

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
      toast.success('Application submitted! Your profile is pending admin approval.')
      qc.invalidateQueries({ queryKey: ['technician', 'register', 'status'] })
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

  const existing = statusQ.data?.data
  if (statusQ.isLoading) return <LoadingSpinner />

  if (existing) {
    const status = existing.onboardingStatus
    const icon = status === 'approved' ? CheckCircle2 : status === 'rejected' ? XCircle : Clock
    const color = status === 'approved' ? 'text-emerald-600' : status === 'rejected' ? 'text-red-500' : 'text-amber-500'
    const bgColor = status === 'approved' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : status === 'rejected' ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
    const Icon = icon

    return (
      <div className="mx-auto max-w-lg animate-fade-in-up space-y-6 py-8">
        <div className={cn('rounded-2xl border p-8 text-center', bgColor)}>
          <Icon className={cn('mx-auto mb-3 h-12 w-12', color)} />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {status === 'approved' ? 'You\'re approved!' : status === 'rejected' ? 'Application not approved' : 'Application pending'}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {status === 'approved'
              ? 'Your technician profile is live. Go to your dashboard to manage requests.'
              : status === 'rejected'
                ? (existing.onboardingNote || 'Your application was not approved at this time. Please contact support.')
                : 'Your application is being reviewed by our team. We\'ll notify you once it\'s approved.'}
          </p>
          {status === 'approved' && (
            <Button className="mt-4" onClick={() => navigate('/technician/dashboard')}>
              Go to Dashboard
            </Button>
          )}
        </div>
      </div>
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
      serviceMode: vals.serviceMode,
      description: vals.description || undefined,
      locationText: vals.locationText,
      lat: vals.lat ? Number(vals.lat) : undefined,
      lng: vals.lng ? Number(vals.lng) : undefined,
    })
  }

  const toggleSpec = (value) => {
    setSelectedSpecs((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    )
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in-up space-y-6 pb-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-500/20">
          <Wrench className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Register as a Technician
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Offer your repair and service skills to car owners across Ghana.
          </p>
        </div>
      </div>

      <Card className="border-slate-200/80 shadow-sm dark:border-slate-700">
        <CardHeader>
          <CardTitle>Service Provider Details</CardTitle>
          <CardDescription>Fill in your info. Your profile will be reviewed before going live.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label>Display name <span className="text-red-500">*</span></Label>
              <Input {...register('displayName')} placeholder="e.g. Kwame's Auto Repair" />
              {errors.displayName && <p className="text-xs text-red-500">{errors.displayName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Business phone</Label>
              <Input {...register('phoneBusiness')} placeholder="e.g. 024 123 4567" />
            </div>

            <div className="space-y-2">
              <Label>Specializations <span className="text-red-500">*</span></Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">Select all that apply.</p>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map((s) => {
                  const selected = selectedSpecs.includes(s.value)
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => toggleSpec(s.value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
                        selected
                          ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
                      )}
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Service mode</Label>
              <select
                {...register('serviceMode')}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Tell buyers what services you offer, your experience, etc."
              />
            </div>

            <LocationPicker
              lat={watch('lat')}
              lng={watch('lng')}
              onChange={(lat, lng) => { setValue('lat', String(lat)); setValue('lng', String(lng)) }}
              locationText={watch('locationText')}
              onLocationText={(t) => setValue('locationText', t)}
            />
            {errors.locationText && <p className="text-xs text-red-500">{errors.locationText.message}</p>}

            <Button type="submit" disabled={m.isPending} className="w-full shadow-md shadow-brand-500/15">
              {m.isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
