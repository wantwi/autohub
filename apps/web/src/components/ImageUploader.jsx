import { useEffect, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getEnv } from '@/lib/env'
import { apiJson } from '@/lib/api'

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

export function ImageUploader({ value = [], onChange, max = 5 }) {
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState(null)
  const { cloudinaryCloudName: cloud, cloudinaryUploadPreset: preset } = getEnv()

  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    if (cloud) loadCloudinaryScript().catch(() => {})
  }, [cloud])

  const open = async () => {
    if (!cloud) {
      alert('Set VITE_CLOUDINARY_CLOUD_NAME for uploads.')
      return
    }
    if (value.length >= max) return
    setBusy(true)
    try {
      await loadCloudinaryScript()
      const uploadPreset = preset || 'unsigned_autohub'
      const w = window.cloudinary.createUploadWidget(
        {
          cloudName: cloud,
          uploadPreset,
          sources: ['local', 'camera'],
          multiple: max - value.length > 1,
          maxFiles: max - value.length,
        },
        (err, result) => {
          if (err) {
            console.error(err)
            return
          }
          if (result.event === 'success') {
            const url = result.info?.secure_url
            if (url) {
              const current = valueRef.current
              const next = [...current, url].slice(0, max)
              onChange?.(next)
            }
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

  const remove = async (urlToRemove) => {
    setRemoving(urlToRemove)
    try {
      await apiJson('/images', {
        method: 'DELETE',
        body: JSON.stringify({ url: urlToRemove }),
      })
    } catch {
      // If server-side delete fails (credentials not set, etc.), still remove locally
    }
    onChange?.(value.filter((u) => u !== urlToRemove))
    setRemoving(null)
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((url, idx) => {
            const isRemoving = removing === url
            return (
              <div
                key={url}
                className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md"
              >
                <img
                  src={url}
                  alt={`Upload ${idx + 1}`}
                  className={`h-full w-full object-cover transition-opacity ${isRemoving ? 'opacity-40' : ''}`}
                />
                {isRemoving ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => remove(url)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-red-600 group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-[10px] font-medium text-white">{idx + 1}/{value.length}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={open}
          disabled={busy || value.length >= max}
        >
          {busy ? 'Opening…' : value.length === 0 ? 'Add photos' : 'Add more'}
        </Button>
        <span className="text-xs text-slate-400">
          {value.length}/{max} photos
        </span>
      </div>
    </div>
  )
}
