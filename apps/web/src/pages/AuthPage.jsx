import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Car } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { getEnv } from '@/lib/env'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OTPInput } from '@/components/OTPInput'
import { toast } from 'sonner'

const phoneSchema = yup.object({
  phone: yup.string().required('Enter your phone number').min(9, 'Too short'),
})

function isNewUser(user) {
  const name = user?.fullName ?? user?.full_name ?? ''
  return !name || name === 'AutoHub User'
}

export function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const googleBtnRef = useRef(null)

  const fromPath = location.state?.from?.pathname
  const { googleClientId } = getEnv()

  function roleRedirect(role) {
    if (fromPath) return fromPath
    switch (role) {
      case 'dealer':     return '/dealer/dashboard'
      case 'technician': return '/technician/dashboard'
      case 'admin':      return '/admin'
      default:           return '/dashboard'
    }
  }

  const completeLogin = useCallback((token, user) => {
    setAuth(token, user)
    const dest = roleRedirect(user?.role)
    if (isNewUser(user)) {
      toast.success('Welcome! Please complete your profile.')
      navigate('/profile', { replace: true })
    } else {
      toast.success('Welcome back')
      navigate(dest, { replace: true })
    }
  }, [setAuth, navigate, fromPath])

  useEffect(() => {
    if (!googleClientId) return

    const SCRIPT_ID = 'google-gsi-script'
    let script = document.getElementById(SCRIPT_ID)

    function initGsi() {
      if (!window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
        auto_select: false,
      })
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'continue_with',
        })
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initGsi
      document.head.appendChild(script)
    } else {
      initGsi()
    }
  }, [googleClientId])

  async function handleGoogleResponse(response) {
    if (!response?.credential) return
    setBusy(true)
    try {
      const res = await apiFetch('/auth/google', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ idToken: response.credential }),
      })
      const payload = res?.data && typeof res.data === 'object' ? res.data : res
      const token = payload?.accessToken ?? payload?.token ?? res?.accessToken ?? res?.token
      const user = payload?.user ?? res?.user
      if (!token) {
        toast.error('Unexpected response — no token')
        return
      }
      completeLogin(token, user || {})
    } catch (e) {
      toast.error(e.message || 'Google sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(phoneSchema),
    defaultValues: { phone: '' },
  })

  const onRequestOtp = handleSubmit(async ({ phone: p }) => {
    setBusy(true)
    try {
      await apiFetch('/auth/request-otp', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ phone: p }),
      })
      setPhone(p)
      setStep('otp')
      toast.success('OTP sent (check SMS in pilot).')
    } catch (e) {
      toast.error(e.message || 'Failed to send OTP')
    } finally {
      setBusy(false)
    }
  })

  const onVerify = async () => {
    if (otp.length < 4) {
      toast.error('Enter the code from SMS')
      return
    }
    setBusy(true)
    try {
      const res = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ phone, code: otp }),
      })
      const payload = res?.data && typeof res.data === 'object' ? res.data : res
      const token =
        payload?.accessToken ??
        payload?.token ??
        res?.accessToken ??
        res?.token ??
        res?.access_token ??
        res?.data?.access_token
      const user = payload?.user ?? res?.data?.user ?? res?.user
      if (!token) {
        toast.error('Unexpected response — no token')
        return
      }
      completeLogin(token, user || { phone })
    } catch (e) {
      const code = e?.payload?.error?.code || e?.payload?.code
      if (code === 'ACCOUNT_NOT_FOUND') {
        toast.error('No account found with this phone number. Please use Google sign-in to create a buyer account.')
      } else {
        toast.error(e.message || 'Invalid code')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-slate-100 via-white to-brand-50/40 px-4 py-12 dark:from-slate-900 dark:via-slate-900 dark:to-brand-950/40 sm:py-16">
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-slate-300/25 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md flex-col justify-center">
        <div className="animate-fade-in-up mb-8 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/25 ring-4 ring-brand-500/10">
            <Car className="h-8 w-8" aria-hidden />
          </div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-400">AutoHub Ghana</p>
        </div>

        <Card className="animate-fade-in-up border-slate-200/80 shadow-xl shadow-slate-200/50 dark:border-slate-700/80 dark:shadow-slate-900/50" style={{ animationDelay: '60ms' }}>
          <CardHeader className="space-y-1 pb-2 text-center sm:text-left">
            <CardTitle className="text-2xl font-bold tracking-tight">Sign in to AutoHub</CardTitle>
            <CardDescription className="text-base">Dealers &amp; technicians sign in with phone OTP. Buyers use Google.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-2">
            <div className="relative min-h-[1px]">
              {step === 'phone' ? (
                <form
                  key="phone"
                  className="animate-fade-in-up space-y-5"
                  onSubmit={onRequestOtp}
                >
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300">
                      Phone
                    </Label>
                    <Input id="phone" placeholder="+233…" className="h-11" {...register('phone')} />
                    {errors.phone ? <p className="text-sm text-red-600 dark:text-red-400">{errors.phone.message}</p> : null}
                  </div>
                  <Button type="submit" variant="brand" className="h-11 w-full text-base" disabled={busy}>
                    Send OTP
                  </Button>
                </form>
              ) : (
                <div key="otp" className="animate-fade-in-up space-y-5">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Code sent to <span className="font-semibold text-slate-900 dark:text-slate-100">{phone}</span>
                  </p>
                  <OTPInput value={otp} onChange={setOtp} disabled={busy} />
                  <Button type="button" variant="brand" className="h-11 w-full text-base" onClick={onVerify} disabled={busy}>
                    Verify & continue
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-slate-600 dark:text-slate-400"
                    onClick={() => setStep('phone')}
                    disabled={busy}
                  >
                    Use different number
                  </Button>
                </div>
              )}
            </div>

            <div className="relative py-1 text-center text-xs text-slate-500 dark:text-slate-400">
              <span className="relative z-10 bg-white px-3 font-medium dark:bg-slate-900">Or</span>
              <div className="absolute inset-x-0 top-1/2 -z-0 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
            {googleClientId ? (
              <div ref={googleBtnRef} className="flex justify-center [&>div]:w-full" />
            ) : (
              <Button type="button" variant="outline" className="h-11 w-full" disabled>
                Google Sign-In (not configured)
              </Button>
            )}
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              <Link to="/" className="font-medium text-brand-700 underline-offset-4 transition-colors hover:text-brand-800 hover:underline dark:text-brand-400 dark:hover:text-brand-300">
                Back home
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
