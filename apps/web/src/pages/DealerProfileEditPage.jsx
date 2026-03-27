import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useEffect, useState } from 'react'
import { Boxes, MapPin, Store } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LocationPicker } from '@/components/LocationPicker'
import { AvatarUploader } from '@/components/AvatarUploader'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { OperatingHoursFields, hoursObjectToRows, rowsToHoursObject } from '@/components/OperatingHoursFields'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const schema = yup.object({
  shopName: yup.string().required(),
  phoneBusiness: yup.string().required(),
  description: yup.string(),
  locationText: yup.string().required(),
  lat: yup.string(),
  lng: yup.string(),
  openOnHolidays: yup.boolean(),
})

const textareaClass =
  'min-h-[88px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:ring-offset-slate-900 dark:placeholder:text-slate-500'

export function DealerProfileEditPage() {
  const qc = useQueryClient()
  const authUser = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [hourRows, setHourRows] = useState(() => hoursObjectToRows({}))

  const q = useQuery({
    queryKey: ['dealer', 'me'],
    queryFn: () => apiJson('/dealers/me'),
  })

  const m = useMutation({
    mutationFn: (body) => apiJson('/dealers/me', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Shop updated')
      qc.invalidateQueries({ queryKey: ['dealer', 'me'] })
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
      shopName: '',
      phoneBusiness: '',
      description: '',
      locationText: '',
      lat: '',
      lng: '',
      openOnHolidays: false,
    },
  })

  useEffect(() => {
    const d = q.data
    if (!d) return
    reset({
      shopName: d.shopName ?? d.shop_name ?? '',
      phoneBusiness: d.phoneBusiness ?? d.phone_business ?? '',
      description: d.description || '',
      locationText: d.locationText ?? d.location_text ?? '',
      lat: d.lat != null ? String(d.lat) : '',
      lng: d.lng != null ? String(d.lng) : '',
      openOnHolidays: Boolean(d.openOnHolidays ?? d.open_on_holidays),
    })
    setHourRows(hoursObjectToRows(d.operatingHours ?? d.operating_hours ?? { mon: '8am-6pm' }))
  }, [q.data, reset])

  const lat = watch('lat')
  const lng = watch('lng')
  const locationText = watch('locationText')

  if (q.isLoading) return <LoadingSpinner />
  if (q.isError) {
    return (
      <div className="animate-fade-in-up rounded-xl border border-red-200 bg-red-50/80 p-6 dark:border-red-800 dark:bg-red-950/50">
        <p className="font-medium text-red-800 dark:text-red-300">Could not load dealer profile. Register your shop first.</p>
      </div>
    )
  }

  const cardHeaderCls = 'space-y-1 border-b border-slate-100 bg-slate-50/50 p-5 pb-4 dark:border-slate-700 dark:bg-slate-800/50'
  const cardContentCls = 'space-y-4 p-5 pt-5'

  return (
    <div className="animate-fade-in-up mx-auto max-w-5xl pb-8">
      <header className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-5">
          <AvatarUploader
            value={authUser?.avatarUrl || authUser?.avatar_url}
            onChange={(url) => saveAvatar.mutate(url)}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Dealer</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">Shop profile</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              How buyers see your business — keep name, phone, location, and hours up to date.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-stretch sm:justify-end">
          <Button asChild variant="outline" size="sm" className="gap-1.5 shadow-sm">
            <Link to="/dealer/parts">
              <Boxes className="h-4 w-4" aria-hidden />
              Manage listings
            </Link>
          </Button>
          <Button type="submit" form="shop-profile-form" size="sm" className="shadow-md shadow-brand-500/15" disabled={m.isPending}>
            Save profile
          </Button>
        </div>
      </header>

      <form
        id="shop-profile-form"
        className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] lg:items-stretch"
        onSubmit={handleSubmit((vals) => {
          m.mutate({
            shopName: vals.shopName,
            phoneBusiness: vals.phoneBusiness,
            description: vals.description,
            locationText: vals.locationText,
            lat: vals.lat ? Number(vals.lat) : undefined,
            lng: vals.lng ? Number(vals.lng) : undefined,
            operatingHours: rowsToHoursObject(hourRows),
            openOnHolidays: Boolean(vals.openOnHolidays),
          })
        })}
      >
        <div className="flex min-h-0 min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
          <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className={cardHeaderCls}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
                  <Store className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-base">Shop &amp; contact</CardTitle>
                  <CardDescription>Name, phone, and short description for search and trust.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className={cardContentCls}>
              <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                <div className="space-y-1.5">
                  <Label htmlFor="shop-profile-name">Shop name</Label>
                  <Input id="shop-profile-name" {...register('shopName')} />
                  {errors.shopName ? <p className="text-sm text-red-600">{errors.shopName.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shop-profile-phone">Business phone</Label>
                  <Input id="shop-profile-phone" type="tel" {...register('phoneBusiness')} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="shop-profile-desc">Description</Label>
                  <textarea id="shop-profile-desc" className={cn(textareaClass, 'resize-y')} rows={3} {...register('description')} />
                </div>
              </div>
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
                  <CardDescription>Address and coordinates for maps and directions.</CardDescription>
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
        </div>

        <Card className="flex flex-col shadow-sm transition-shadow hover:shadow-md lg:col-start-2 lg:row-start-1 lg:h-full lg:min-h-0">
          <CardHeader className={cardHeaderCls}>
            <CardTitle className="text-base">Operating hours</CardTitle>
            <CardDescription>Set hours for each day of the week.</CardDescription>
          </CardHeader>
          <CardContent className={cn(cardContentCls, 'flex min-h-0 flex-1 flex-col lg:overflow-y-auto')}>
            <OperatingHoursFields key={q.dataUpdatedAt} rows={hourRows} onRowsChange={setHourRows} />
            <div className="rounded-lg border border-slate-200 bg-brand-50/30 px-3 py-3 dark:border-slate-700 dark:bg-brand-500/10">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-700"
                  {...register('openOnHolidays')}
                />
                <span>
                  <span className="font-medium">Open during public holidays</span>
                  <span className="mt-0.5 block text-xs font-normal text-slate-600 dark:text-slate-400">
                    Check this if buyers can visit or reach you on national/public holidays (hours may still vary).
                  </span>
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="col-span-full flex justify-end border-t border-slate-200 pt-6 dark:border-slate-700">
          <Button type="submit" disabled={m.isPending} className="shadow-md shadow-brand-500/15">
            Save profile
          </Button>
        </div>
      </form>
    </div>
  )
}
