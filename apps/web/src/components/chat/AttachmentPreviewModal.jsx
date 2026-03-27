import { useEffect, useRef, useState } from 'react'
import { X, Send, Loader2, Image as ImageIcon, Video } from 'lucide-react'
import { getEnv } from '@/lib/env'
import { cn } from '@/lib/utils'

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function AttachmentPreviewModal({ file, fileType, onSend, onClose }) {
  const [caption, setCaption] = useState('')
  const [localUrl, setLocalUrl] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState(null)
  const [error, setError] = useState(null)
  const captionRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setLocalUrl(url)
    startUpload(file)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    const timer = setTimeout(() => captionRef.current?.focus(), 200)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const startUpload = async (f) => {
    const { cloudinaryCloudName, cloudinaryUploadPreset } = getEnv()
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      setError('Cloudinary config missing')
      return
    }

    const resourceType = fileType === 'image' ? 'image' : 'video'
    const formData = new FormData()
    formData.append('file', f)
    formData.append('upload_preset', cloudinaryUploadPreset)

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const xhr = new XMLHttpRequest()
      abortRef.current = xhr

      const result = await new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error('Upload failed'))
          }
        })
        xhr.addEventListener('error', () => reject(new Error('Upload failed')))
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/${resourceType}/upload`)
        xhr.send(formData)
      })

      if (result.secure_url) {
        setUploadedUrl(result.secure_url)
      }
    } catch (err) {
      if (err.message !== 'Upload cancelled') {
        setError('Upload failed. Please try again.')
      }
    } finally {
      setUploading(false)
      abortRef.current = null
    }
  }

  const handleSend = () => {
    if (!uploadedUrl) return
    onSend({
      url: uploadedUrl,
      type: fileType,
      name: file.name,
      caption: caption.trim() || null,
    })
  }

  const handleClose = () => {
    if (abortRef.current) abortRef.current.abort()
    onClose()
  }

  const isReady = !!uploadedUrl && !uploading

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-2 py-2 dark:border-slate-700">
        <button
          type="button"
          onClick={handleClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          {fileType === 'image' ? <ImageIcon className="h-4 w-4 shrink-0" /> : <Video className="h-4 w-4 shrink-0" />}
          <span className="truncate">{file?.name}</span>
          <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{formatSize(file?.size)}</span>
        </div>
      </div>

      {/* Media preview area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-50 p-4 dark:bg-slate-900">
        {fileType === 'image' && localUrl && (
          <img
            src={localUrl}
            alt="Preview"
            className="max-h-full max-w-full rounded-lg object-contain shadow-sm"
          />
        )}
        {fileType === 'video' && localUrl && (
          <video
            src={localUrl}
            controls
            className="max-h-full max-w-full rounded-lg shadow-sm"
          />
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="relative h-14 w-14">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                <circle
                  cx="28" cy="28" r="24"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="3"
                />
                <circle
                  cx="28" cy="28" r="24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - uploadProgress / 100)}`}
                  className="transition-all duration-300"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                {uploadProgress}%
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="px-3 py-1.5 text-center text-xs text-red-500">
          {error}
          <button
            type="button"
            onClick={() => startUpload(file)}
            className="ml-1.5 font-semibold text-red-700 underline dark:text-red-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* Caption + send */}
      <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-2.5 dark:border-slate-700">
        <input
          ref={captionRef}
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && isReady) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Add a caption..."
          className="min-h-[36px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
        />
        <button
          type="button"
          disabled={!isReady}
          onClick={handleSend}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-md transition-all',
            isReady
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500',
          )}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}
