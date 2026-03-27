import { useCallback, useRef, useState } from 'react'
import { Play, Pause, FileText, Download, X, ShoppingBag, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

function extractFilename(url) {
  try {
    const parts = url.split('/')
    const raw = parts[parts.length - 1]
    return decodeURIComponent(raw.split('?')[0])
  } catch {
    return 'File'
  }
}

function getFileExt(url) {
  try {
    return url.split('/').pop().split('?')[0].split('.').pop().toLowerCase()
  } catch {
    return ''
  }
}

const EXT_BADGE = {
  pdf: { label: 'PDF', bg: 'bg-red-500' },
  doc: { label: 'DOC', bg: 'bg-blue-500' },
  docx: { label: 'DOCX', bg: 'bg-blue-500' },
  xls: { label: 'XLS', bg: 'bg-emerald-500' },
  xlsx: { label: 'XLSX', bg: 'bg-emerald-500' },
  csv: { label: 'CSV', bg: 'bg-emerald-500' },
  txt: { label: 'TXT', bg: 'bg-slate-500' },
}

function ImageBubble({ url, caption, time }) {
  const [lightbox, setLightbox] = useState(false)

  return (
    <>
      <div className="-mx-2.5 -mt-1.5 cursor-pointer" onClick={() => setLightbox(true)}>
        <div className="relative">
          <img
            src={url}
            alt="Shared image"
            className="w-full max-w-[280px] rounded-md object-cover"
            loading="lazy"
          />
          {!caption && (
            <div className="absolute bottom-1 right-1 rounded bg-black/40 px-1.5 py-0.5 backdrop-blur-sm">
              <span className="text-[10px] text-white">{time}</span>
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={url}
            alt="Full image"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

function VideoBubble({ url, caption, time }) {
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef(null)
  const posterUrl = url.replace(/\.[^.]+$/, '.jpg')

  const handlePlay = (e) => {
    e.stopPropagation()
    setPlaying(true)
    videoRef.current?.play()
  }

  return (
    <div className="-mx-2.5 -mt-1.5">
      <div className="relative">
        {!playing ? (
          <>
            <img
              src={posterUrl}
              alt="Video thumbnail"
              className="w-full max-w-[280px] rounded-md object-cover"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={handlePlay}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60"
              >
                <Play className="ml-0.5 h-6 w-6" fill="white" />
              </button>
            </div>
            {!caption && (
              <div className="absolute bottom-1 right-1 rounded bg-black/40 px-1.5 py-0.5 backdrop-blur-sm">
                <span className="text-[10px] text-white">{time}</span>
              </div>
            )}
          </>
        ) : (
          <video
            ref={videoRef}
            src={url}
            controls
            autoPlay
            className="w-full max-w-[280px] rounded-md"
          />
        )}
      </div>
    </div>
  )
}

const WAVEFORM_BARS = 28

function AudioBubble({ url }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) audioRef.current.pause()
    else audioRef.current.play()
    setPlaying(!playing)
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0)
  }

  const handleSeek = useCallback((e) => {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = pct * duration
  }, [duration])

  const formatDur = (s) => {
    if (!s || !isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const bars = useRef(
    Array.from({ length: WAVEFORM_BARS }, () => 0.15 + Math.random() * 0.85)
  ).current

  const filledBars = Math.floor((progress / 100) * WAVEFORM_BARS)

  return (
    <div className="flex w-52 items-center gap-2">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => { setPlaying(false); setProgress(0) }}
      />
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition-all hover:bg-emerald-600"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
      </button>
      <div className="flex-1" onClick={handleSeek}>
        <div className="flex h-7 cursor-pointer items-end gap-[2px]">
          {bars.map((h, i) => (
            <div
              key={i}
              className={cn(
                'w-[2.5px] rounded-full transition-colors duration-100',
                i < filledBars ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-500',
              )}
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-400">
          {formatDur(playing ? audioRef.current?.currentTime : duration)}
        </p>
      </div>
    </div>
  )
}

function DocumentBubble({ url }) {
  const filename = extractFilename(url)
  const ext = getFileExt(url)
  const badge = EXT_BADGE[ext]

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download
      className="flex items-center gap-3 rounded-lg bg-white/50 px-3 py-2 transition-colors hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20"
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 shadow-sm dark:bg-slate-600">
        <FileText className="h-5 w-5 text-slate-500 dark:text-slate-300" />
        {badge && (
          <span className={cn('absolute -bottom-1 -right-1 rounded px-1 py-0.5 text-[8px] font-bold text-white', badge.bg)}>
            {badge.label}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{filename}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500">{ext.toUpperCase()} · Tap to download</p>
      </div>
      <Download className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
    </a>
  )
}

function PartCardBubble({ payload }) {
  if (!payload) return null
  const { partId, name, price, image } = payload
  const formattedPrice = price != null
    ? `GH₵ ${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    : null

  return (
    <Link
      to={partId ? `/parts/${partId}` : '#'}
      className="-mx-2.5 -mt-1.5 block overflow-hidden transition-opacity hover:opacity-90"
    >
      {image && (
        <img
          src={image}
          alt={name}
          className="h-36 w-full max-w-[280px] object-cover"
          loading="lazy"
        />
      )}
      <div className="flex items-start gap-2.5 bg-gradient-to-r from-slate-50 to-slate-100 px-3 py-2.5 dark:from-slate-800 dark:to-slate-700">
        {!image && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/40">
            <ShoppingBag className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{name}</p>
          {formattedPrice && (
            <p className="mt-0.5 text-[12px] font-bold text-emerald-600 dark:text-emerald-400">{formattedPrice}</p>
          )}
        </div>
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
      </div>
    </Link>
  )
}

function timeStr(dateStr) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const ATTACHMENT_TYPE_LABELS = {
  image: 'Photo',
  video: 'Video',
  audio: 'Voice note',
  document: 'Document',
  part_card: 'Part enquiry',
}

export function ReplyQuote({ replyTo, onScrollTo }) {
  if (!replyTo) return null

  const previewText = replyTo.body
    || ATTACHMENT_TYPE_LABELS[replyTo.attachmentType]
    || 'Message'

  return (
    <button
      type="button"
      onClick={() => onScrollTo?.(replyTo.id)}
      className="mb-1 flex w-full items-start gap-0 overflow-hidden rounded-md bg-black/5 text-left transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <div className="w-1 self-stretch rounded-l bg-emerald-500" />
      <div className="min-w-0 flex-1 px-2 py-1.5">
        <p className="truncate text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          {replyTo.senderName || 'Unknown'}
        </p>
        <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
          {previewText}
        </p>
      </div>
    </button>
  )
}

export function MessageContent({ msg, onScrollToMessage }) {
  const { attachmentUrl, attachmentType, body, createdAt, replyTo, payload } = msg
  const time = timeStr(createdAt)
  const isPartCard = attachmentType === 'part_card'
  const hasMedia = (attachmentUrl && (attachmentType === 'image' || attachmentType === 'video')) || isPartCard

  return (
    <>
      {replyTo && (
        <div className={hasMedia ? 'px-2.5 pt-1.5' : ''}>
          <ReplyQuote replyTo={replyTo} onScrollTo={onScrollToMessage} />
        </div>
      )}
      {isPartCard && (
        <PartCardBubble payload={payload} />
      )}
      {attachmentUrl && attachmentType === 'image' && (
        <ImageBubble url={attachmentUrl} caption={body} time={time} />
      )}
      {attachmentUrl && attachmentType === 'video' && (
        <VideoBubble url={attachmentUrl} caption={body} time={time} />
      )}
      {attachmentUrl && attachmentType === 'audio' && (
        <AudioBubble url={attachmentUrl} />
      )}
      {attachmentUrl && attachmentType === 'document' && (
        <DocumentBubble url={attachmentUrl} />
      )}
      {body && (
        <span className={cn('whitespace-pre-wrap break-words', hasMedia && 'mt-1 block px-2.5 pb-0.5')}>{body}</span>
      )}
    </>
  )
}

export function hasMediaAttachment(msg) {
  return (msg.attachmentUrl && (msg.attachmentType === 'image' || msg.attachmentType === 'video'))
    || msg.attachmentType === 'part_card'
}
