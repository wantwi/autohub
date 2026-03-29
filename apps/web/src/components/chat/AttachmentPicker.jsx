import { useRef, useState } from 'react'
import { FileText, Image, Loader2, MapPin, Mic, Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import { getEnv } from '@/lib/env'
import { cn } from '@/lib/utils'

const PICKER_OPTIONS = [
  { key: 'document', label: 'Document', icon: FileText, accept: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt', resourceType: 'raw', type: 'document', bg: 'bg-indigo-500' },
  { key: 'photo', label: 'Photos & videos', icon: Image, accept: 'image/*,video/*', resourceType: 'auto', type: 'media', bg: 'bg-blue-500' },
  { key: 'location', label: 'Location', icon: MapPin, type: 'location', bg: 'bg-emerald-500' },
  { key: 'voice', label: 'Audio', icon: Mic, type: 'voice', bg: 'bg-orange-500' },
]

export function AttachmentPicker({ onMediaSelect, onDocumentSelect, onVoiceNote, onLocationSelect, disabled }) {
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef(null)
  const pendingOptionRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [locating, setLocating] = useState(false)

  const handleOptionClick = async (option) => {
    setOpen(false)

    if (option.key === 'voice') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        onVoiceNote?.(stream)
      } catch {
        toast.error('Microphone access denied. Check your browser permissions.')
      }
      return
    }

    if (option.key === 'location') {
      if (!navigator.geolocation) {
        toast.error('Location is not supported on this device.')
        return
      }
      setLocating(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false)
          onLocationSelect?.({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          setLocating(false)
          toast.error('Could not get your location. Check your location permissions.')
        },
        { enableHighAccuracy: true, timeout: 15000 },
      )
      return
    }

    pendingOptionRef.current = option
    const input = fileInputRef.current
    input.accept = option.accept
    if (option.capture) {
      input.setAttribute('capture', option.capture)
    } else {
      input.removeAttribute('capture')
    }
    input.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !pendingOptionRef.current) return

    const option = pendingOptionRef.current
    e.target.value = ''
    pendingOptionRef.current = null

    if (option.type === 'document') {
      await uploadDocument(file, option)
    } else {
      const fileType = file.type.startsWith('video/') ? 'video' : 'image'
      onMediaSelect?.({ file, fileType })
    }
  }

  const uploadDocument = async (file, option) => {
    const { cloudinaryCloudName, cloudinaryUploadPreset } = getEnv()
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', cloudinaryUploadPreset)

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/${option.resourceType}/upload`,
        { method: 'POST', body: formData },
      )
      const data = await res.json()

      if (data.secure_url) {
        onDocumentSelect?.({
          url: data.secure_url,
          type: 'document',
          name: file.name,
          size: file.size,
        })
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {locating && (
        <div className="absolute bottom-full left-0 z-50 mb-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 shadow-lg dark:border-emerald-800 dark:bg-emerald-900/40">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Getting location...</span>
        </div>
      )}

      <button
        type="button"
        disabled={disabled || uploading || locating}
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-600 dark:hover:text-slate-200',
          (uploading || locating) && 'animate-pulse',
          open && 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-200',
        )}
      >
        {uploading || locating ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300" />
        ) : (
          <Paperclip className="h-5 w-5" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-50 mb-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-600 dark:bg-slate-800">
            {PICKER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleOptionClick(opt)}
                className="flex w-full items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg text-white',
                  opt.bg,
                )}>
                  <opt.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function DocumentPreview({ attachment, onRemove }) {
  if (!attachment) return null

  const EXT_COLORS = {
    pdf: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    doc: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    docx: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    xls: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    xlsx: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    csv: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    txt: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600',
  }

  const ext = attachment.name?.split('.').pop()?.toLowerCase() || ''
  const colorClass = EXT_COLORS[ext] || 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'

  return (
    <div className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5', colorClass)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/80 shadow-sm dark:bg-white/10">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">
          {attachment.name || 'Document'}
        </p>
        <p className="text-[10px] opacity-60">
          {ext.toUpperCase()}{attachment.size ? ` · ${(attachment.size / 1024).toFixed(0)} KB` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-7 w-7 items-center justify-center rounded-full opacity-50 transition-all hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
