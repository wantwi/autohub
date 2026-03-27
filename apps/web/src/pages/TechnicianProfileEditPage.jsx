import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useEffect, useState } from 'react'
import { Clock, ExternalLink, Image, MapPin, Save, User, Wrench } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { SPECIALIZATIONS, SERVICE_MODES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LocationPicker } from '@/components/LocationPicker'
import { ImageUploader } from '@/components/ImageUploader'
import { AvatarUploader } from '@/components/AvatarUploader'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { OperatingHoursFields, hoursObjectToRows, rowsToHoursObject } from '@/components/OperatingHoursFields'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const schema = yup.object({
  displayName: yup.string().required(),
  phoneBusiness: yup.string(),
  description: yup.string(),
  specializations: yup.array().of(yup.string()),
  serviceMode: yup.string().oneOf(['mobile', 'workshop', 'both']).required(),
  locationText: yup.string(),
  lat: yup.string(),
  lng: yup.string(),
  openOnHolidays: yup.boolean(),
})

const textareaClass =
  'min-h-[88px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:ring-offset-slate-900 dark:placeholder:text-slate-500'

const checkClass =
  'mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-700'

const radioClass =
  'h-4 w-4 shrink-0 border-slate-300 text-brand-600 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-700'

export function TechnicianProfileEditPage() {
  const qc = useQueryClient()
  const authUser = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [hourRows, setHourRows] = useState(() => hoursObjectToRows({}))
  const [bannerImages, setBannerImages] = useState([])

  const q = useQuery({
    queryKey: ['technician', 'me'],
    queryFn: () => apiJson('/technicians/me'),
  })

  const m = useMutation({
    mutationFn: (body) => apiJson('/technicians/me', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Profile updated')
      qc.invalidateQueries({ queryKey: ['technician', 'me'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const saveAvatar = useMutation({
    mutationFn: (url) => apiJson('/users/me', { method: 'PUT', body: JSON.stringify({ avatarUrl: url }) }),
    onSuccess: (me) => {
      setUser(me)
      toast.success('Profile photo updated')
    },
    onError: (e) => toast.error(e.message),
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      displayName: '',
      phoneBusiness: '',
      description: '',
      specializations: [],
      serviceMode: 'both',
      locationText: '',
      lat: '',
      lng: '',
      openOnHolidays: false,
    },
  })

  useEffect(() => {
    const d = q.data
    if (!d) return
    const specs = d.specializations
    reset({
      displayName: d.displayName ?? d.display_name ?? '',
      phoneBusiness: d.phoneBusiness ?? d.phone_business ?? '',
      description: d.description || '',
      specializations: Array.isArray(specs) ? specs : [],
      serviceMode: d.serviceMode ?? d.service_mode ?? 'both',
      locationText: d.locationText ?? d.location_text ?? '',
      lat: d.lat != null ? String(d.lat) : '',
      lng: d.lng != null ? String(d.lng) : '',
      openOnHolidays: Boolean(d.openOnHolidays ?? d.open_on_holidays),
    })
    setHourRows(hoursObjectToRows(d.operatingHours ?? d.operating_hours ?? {}))
    const banner = d.bannerUrl ?? d.banner_url
    setBannerImages(banner ? [banner] : [])
  }, [q.data, reset])

  const lat = watch('lat')
  const lng = watch('lng')
  const locationText = watch('locationText')
  const specializations = watch('specializations') || []

  function toggleSpecialization(value) {
    const cur = specializations
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
    setValue('specializations', next, { shouldDirty: true })
  }

  if (q.isLoading) return <LoadingSpinner />
  if (q.isError) {
    return (
      <div className="animate-fade-in-up rounded-xl border border-red-200 bg-red-50/80 p-6 dark:border-red-800 dark:bg-red-950/50">
        <p className="font-medium text-red-800 dark:text-red-300">
          Could not load technician profile. Complete onboarding or register as a technician first.
        </p>
      </div>
    )
  }

  const cardHeaderCls =
    'space-y-1 border-b border-slate-100 bg-slate-50/50 p-5 pb-4 dark:border-slate-700 dark:bg-slate-800/50'
  const cardContentCls = 'space-y-4 p-5 pt-5'

  return (
    <div className="animate-fade-in-up mx-auto max-w-5xl pb-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-5">
          <AvatarUploader
            value={authUser?.avatarUrl || authUser?.avatar_url}
            onChange={(url) => saveAvatar.mutate(url)}
            size="sm"
          />
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Technician</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
              Profile &amp; availability
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            How clients find you — keep your display name, skills, service mode, location, and hours current.
          </p>
          </div>
        </div>
        {q.data?.id && (
          <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
            <Link to={`/services/${q.data.id}`}>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              View public profile
            </Link>
          </Button>
        )}
      </header>

      <form
        id="technician-profile-form"
        className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] lg:items-stretch"
        onSubmit={handleSubmit((vals) => {
          m.mutate({
            displayName: vals.displayName,
            phoneBusiness: vals.phoneBusiness || null,
            description: vals.description || null,
            specializations: vals.specializations ?? [],
            serviceMode: vals.serviceMode,
            locationText: vals.locationText || null,
            lat: vals.lat ? Number(vals.lat) : null,
            lng: vals.lng ? Number(vals.lng) : null,
            operatingHours: rowsToHoursObject(hourRows),
            openOnHolidays: Boolean(vals.openOnHolidays),
            bannerUrl: bannerImages[0] || null,
          })
        })}
      >
        <div className="flex min-h-0 min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
          <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className={cardHeaderCls}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
                  <User className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-base">Contact &amp; bio</CardTitle>
                  <CardDescription>Display name, business phone, and a short description.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className={cardContentCls}>
              <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tech-profile-display-name">Display name</Label>
                  <Input id="tech-profile-display-name" {...register('displayName')} />
                  {errors.displayName ? <p className="text-sm text-red-600 dark:text-red-400">{errors.displayName.message}</p> : null}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tech-profile-phone">Business phone</Label>
                  <Input id="tech-profile-phone" type="tel" {...register('phoneBusiness')} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tech-profile-desc">Description</Label>
                  <textarea
                    id="tech-profile-desc"
                    className={cn(textareaClass, 'resize-y')}
                    rows={3}
                    {...register('description')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className={cardHeaderCls}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/5 text-slate-800 dark:bg-slate-100/10 dark:text-slate-300">
                  <Wrench className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-base">Specializations &amp; service mode</CardTitle>
                  <CardDescription>What you offer and how you deliver service.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className={cn(cardContentCls, 'space-y-6')}>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-slate-900 dark:text-slate-100">Specializations</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SPECIALIZATIONS.map(({ value, label }) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition-colors hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:border-slate-500"
                    >
                      <input
                        type="checkbox"
                        className={checkClass}
                        checked={specializations.includes(value)}
                        onChange={() => toggleSpecialization(value)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-slate-900 dark:text-slate-100">Service mode</legend>
                <div className="flex flex-col gap-2">
                  {SERVICE_MODES.map(({ value, label }) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition-colors hover:border-slate-300 has-[:checked]:border-brand-500/40 has-[:checked]:bg-brand-50/40 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:border-slate-500 dark:has-[:checked]:border-brand-500/30 dark:has-[:checked]:bg-brand-500/10"
                    >
                      <input type="radio" className={radioClass} value={value} {...register('serviceMode')} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {errors.serviceMode ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.serviceMode.message}</p>
                ) : null}
              </fieldset>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-1">
          <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className={cardHeaderCls}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">
                  <Image className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-base">Profile banner</CardTitle>
                  <CardDescription>A cover photo shown on your public profile and directory card.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className={cardContentCls}>
              <ImageUploader value={bannerImages} onChange={setBannerImages} max={1} />
              {bannerImages.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload an image of your workshop, tools, or a branded cover. 16:9 aspect works best.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className={cardHeaderCls}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/5 text-slate-800 dark:bg-slate-100/10 dark:text-slate-300">
                  <MapPin className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-base">Location</CardTitle>
                  <CardDescription>Address or area and coordinates for maps.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className={cardContentCls}>
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
            </CardContent>
          </Card>

          <Card className="flex flex-col border-slate-200/80 shadow-sm transition-shadow hover:shadow-md lg:min-h-0">
            <CardHeader className={cardHeaderCls}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/5 text-slate-800 dark:bg-slate-100/10 dark:text-slate-300">
                  <Clock className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-base">Operating hours</CardTitle>
                  <CardDescription>When you are available for service.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className={cn(cardContentCls, 'flex min-h-0 flex-1 flex-col lg:overflow-y-auto')}>
              <OperatingHoursFields key={q.dataUpdatedAt} rows={hourRows} onRowsChange={setHourRows} />
              <div className="rounded-lg border border-slate-200 bg-brand-50/30 px-3 py-3 dark:border-slate-700 dark:bg-brand-500/10">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-800 dark:text-slate-200">
                  <input type="checkbox" className={checkClass} {...register('openOnHolidays')} />
                  <span>
                    <span className="font-medium">Open during public holidays</span>
                    <span className="mt-0.5 block text-xs font-normal text-slate-600 dark:text-slate-400">
                      Check this if you accept jobs on national or public holidays (hours may still vary).
                    </span>
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-full flex justify-end border-t border-slate-200 pt-6 dark:border-slate-700">
          <Button type="submit" disabled={m.isPending} className="gap-2 shadow-md shadow-brand-500/15">
            <Save className="h-4 w-4" aria-hidden />
            Save profile
          </Button>
        </div>
      </form>
    </div>
  )
}
