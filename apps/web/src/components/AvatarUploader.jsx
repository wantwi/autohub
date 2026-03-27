import { useEffect, useState } from 'react'
import { Camera, Loader2, User } from 'lucide-react'
import { getEnv } from '@/lib/env'
import { cn } from '@/lib/utils'

function loadCloudinaryScript() {
  if (typeof window === 'undefined') return Promise.reject()
  if (window.cloudinary) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://upload-widget.cloudinary.com/latest/global/all.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Cloudinary script failed'))
    document.body.appendChild(s)
  })
}

export function AvatarUploader({ value, onChange, size = 'lg', className }) {
  const [busy, setBusy] = useState(false)
  const { cloudinaryCloudName: cloud, cloudinaryUploadPreset: preset } = getEnv()

  useEffect(() => {
    if (cloud) loadCloudinaryScript().catch(() => {})
  }, [cloud])

  const open = async () => {
    if (!cloud) {
      alert('Set VITE_CLOUDINARY_CLOUD_NAME for uploads.')
      return
    }
    setBusy(true)
    try {
      await loadCloudinaryScript()
      const w = window.cloudinary.createUploadWidget(
        {
          cloudName: cloud,
          uploadPreset: preset || 'unsigned_autohub',
          sources: ['local', 'camera'],
          multiple: false,
          maxFiles: 1,
          cropping: true,
          croppingAspectRatio: 1,
          croppingShowDimensions: true,
          resourceType: 'image',
        },
        (err, result) => {
          if (err) {
            console.error(err)
            return
          }
          if (result.event === 'success') {
            const url = result.info?.secure_url
            if (url) onChange?.(url)
          }
        },
      )
      w.open()
    } catch (e) {
      alert(e.message || 'Upload unavailable')
    } finally {
      setBusy(false)
    }
  }

  const px = size === 'lg' ? 'h-28 w-28' : 'h-20 w-20'
  const iconPx = size === 'lg' ? 'h-10 w-10' : 'h-7 w-7'
  const camPx = size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'
  const camIcon = size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className={cn(
          'group relative overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-100 transition-all hover:border-brand-400 hover:shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:hover:border-brand-500',
          px,
        )}
      >
        {value ? (
          <img src={value} alt="Profile" className="h-full w-full rounded-full object-cover" />
        ) : (
          <User className={cn('mx-auto text-slate-400 dark:text-slate-500', iconPx)} />
        )}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-all group-hover:bg-black/40',
          busy && 'bg-black/40',
        )}>
          {busy ? (
            <Loader2 className={cn('animate-spin text-white', camPx)} />
          ) : (
            <div className={cn(
              'flex items-center justify-center rounded-full bg-white/90 opacity-0 shadow-md transition-all group-hover:opacity-100 dark:bg-slate-800/90',
              camPx,
            )}>
              <Camera className={cn('text-slate-700 dark:text-slate-300', camIcon)} />
            </div>
          )}
        </div>
      </button>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {value ? 'Click to change' : 'Upload photo'}
      </p>
    </div>
  )
}
