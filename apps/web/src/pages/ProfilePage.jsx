import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Car, Phone, UserRound } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { normalizeList } from '@/lib/normalize'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AvatarUploader } from '@/components/AvatarUploader'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { toast } from 'sonner'

const profileSchema = yup.object({
  full_name: yup.string().required('Name is required'),
  email: yup.string().email('Invalid email').nullable(),
  phone: yup.string().nullable(),
})

const vehicleSchema = yup.object({
  make: yup.string().required(),
  model: yup.string().required(),
  year: yup.number().typeError('Year required').min(1980).max(new Date().getFullYear() + 1),
})

export function ProfilePage() {
  const qc = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)

  const vehiclesQ = useQuery({
    queryKey: ['vehicles', 'me'],
    queryFn: () => apiJson('/users/me/vehicles'),
  })

  const {
    register: regProfile,
    handleSubmit: submitProfile,
    formState: { errors: errProfile },
  } = useForm({
    resolver: yupResolver(profileSchema),
    values: {
      full_name: user?.full_name || user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  })

  const {
    register: regV,
    handleSubmit: submitV,
    reset: resetV,
    formState: { errors: errV },
  } = useForm({
    resolver: yupResolver(vehicleSchema),
    defaultValues: { make: '', model: '', year: new Date().getFullYear() },
  })

  const saveProfile = useMutation({
    mutationFn: (body) => apiJson('/users/me', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: (me) => {
      setUser(me)
      toast.success('Profile updated')
      qc.invalidateQueries({ queryKey: ['vehicles', 'me'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const addVehicle = useMutation({
    mutationFn: (body) => apiJson('/users/me/vehicles', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Vehicle added')
      qc.invalidateQueries({ queryKey: ['vehicles', 'me'] })
      resetV()
    },
    onError: (e) => toast.error(e.message),
  })

  const delVehicle = useMutation({
    mutationFn: (vid) => apiJson(`/users/me/vehicles/${vid}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Removed')
      qc.invalidateQueries({ queryKey: ['vehicles', 'me'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const { items: vehicles } = normalizeList(vehiclesQ.data)

  const handleAvatarChange = (url) => {
    saveProfile.mutate({ avatarUrl: url })
  }

  return (
    <div className="animate-fade-in-up mx-auto max-w-3xl space-y-8 pb-2">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Account</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Profile</h1>
        <p className="text-slate-600 dark:text-slate-400">Update your personal details and manage saved vehicles.</p>
      </div>

      <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400">
              <UserRound className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-lg">Your details</CardTitle>
              <CardDescription>Your name and contact info on AutoHub.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex justify-center">
            <AvatarUploader
              value={user?.avatarUrl || user?.avatar_url}
              onChange={handleAvatarChange}
            />
          </div>
          <form className="space-y-5" onSubmit={submitProfile((vals) => saveProfile.mutate({ fullName: vals.full_name, email: vals.email || null, phone: vals.phone || null }))}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" {...regProfile('full_name')} />
                {errProfile.full_name ? <p className="text-sm text-red-600 dark:text-red-400">{errProfile.full_name.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" {...regProfile('email')} />
                {errProfile.email ? <p className="text-sm text-red-600 dark:text-red-400">{errProfile.email.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" placeholder="0XX XXX XXXX" {...regProfile('phone')} />
                {errProfile.phone ? <p className="text-sm text-red-600 dark:text-red-400">{errProfile.phone.message}</p> : null}
              </div>
            </div>
            <Button type="submit" disabled={saveProfile.isPending} className="shadow-md shadow-brand-500/15">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/5 text-slate-800 dark:bg-slate-100/10 dark:text-slate-200">
              <Car className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-lg">Vehicles</CardTitle>
              <CardDescription>Manage saved cars and add new ones.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {vehiclesQ.isLoading ? <LoadingSpinner /> : null}
          <ul className="space-y-3">
            {vehicles.map((v, i) => (
              <li
                key={v.id}
                className="animate-fade-in-up flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-4 shadow-sm transition-all hover:border-brand-100 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {v.make} {v.model}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{v.year}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-400" onClick={() => delVehicle.mutate(v.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="mb-4 text-sm font-medium text-slate-700 dark:text-slate-300">Add a vehicle</p>
            <form className="grid gap-4 sm:grid-cols-3" onSubmit={submitV((vals) => addVehicle.mutate(vals))}>
              <div className="space-y-2">
                <Label>Make</Label>
                <Input {...regV('make')} />
                {errV.make ? <p className="text-xs text-red-600 dark:text-red-400">{errV.make.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input {...regV('model')} />
                {errV.model ? <p className="text-xs text-red-600 dark:text-red-400">{errV.model.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" {...regV('year')} />
                {errV.year ? <p className="text-xs text-red-600 dark:text-red-400">{errV.year.message}</p> : null}
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" disabled={addVehicle.isPending} variant="outline" className="shadow-sm">
                  Add vehicle
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400">
              <Phone className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-lg">Contact preferences</CardTitle>
              <CardDescription>How dealers can reach you.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Dealers will see your phone number when you enquire about a part. Make sure your contact info above is up to date.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
