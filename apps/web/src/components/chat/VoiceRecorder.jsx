import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square, X, Loader2, Play, Pause, Send, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { getEnv } from '@/lib/env'
import { cn } from '@/lib/utils'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const WAVE_BARS = 20

export function VoiceRecorder({ onComplete, onCancel, stream: externalStream }) {
  const [phase, setPhase] = useState('recording')
  const [elapsed, setElapsed] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [playProgress, setPlayProgress] = useState(0)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const audioRef = useRef(null)
  const waveBars = useRef(
    Array.from({ length: WAVE_BARS }, () => 0.2 + Math.random() * 0.8)
  ).current

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  useEffect(() => () => {
    cleanup()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }, [cleanup, audioUrl])

  const startRecording = useCallback(async (stream) => {
    try {
      const mediaStream = stream || await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = mediaStream

      const mimeTypes = [
        'audio/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
      ]
      const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || ''

      const recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        setPhase('preview')
      }

      recorder.start(100)
      setPhase('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000)
    } catch (err) {
      console.error('Recording failed:', err)
      toast.error('Could not start recording. Check microphone permissions.')
      onCancel?.()
    }
  }, [onCancel])

  const stopRecording = () => {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  const cancelRecording = () => {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    cleanup()
    onCancel?.()
  }

  const reRecord = () => {
    if (audioRef.current) audioRef.current.pause()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setPlaying(false)
    setPlayProgress(0)
    startRecording(null)
  }

  const togglePlayback = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  const sendVoiceNote = async () => {
    if (!audioBlob) return
    if (audioRef.current) audioRef.current.pause()

    const { cloudinaryCloudName, cloudinaryUploadPreset } = getEnv()
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      toast.error('Upload configuration missing.')
      return
    }

    setPhase('uploading')

    try {
      const blobType = audioBlob.type || ''
      const ext = blobType.includes('mp4') || blobType.includes('m4a') ? 'm4a'
        : blobType.includes('aac') ? 'aac'
        : blobType.includes('ogg') ? 'ogg'
        : 'webm'

      const formData = new FormData()
      formData.append('file', audioBlob, `voice-note.${ext}`)
      formData.append('upload_preset', cloudinaryUploadPreset)

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/video/upload`,
        { method: 'POST', body: formData },
      )
      const data = await res.json()

      if (data.secure_url) {
        onComplete?.({
          url: data.secure_url,
          type: 'audio',
          name: 'Voice note',
          duration: Math.round(data.duration || elapsed),
        })
      } else {
        console.error('Cloudinary response:', data)
        toast.error(data.error?.message || 'Voice note upload failed.')
        setPhase('preview')
      }
    } catch (err) {
      console.error('Voice note upload failed:', err)
      toast.error('Voice note upload failed. Check your connection.')
      setPhase('preview')
    }
  }

  useEffect(() => {
    startRecording(externalStream || null)
  }, [])

  const filledBars = Math.floor((playProgress / 100) * WAVE_BARS)

  if (phase === 'recording') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-200/60 bg-red-50/50 px-4 py-3 dark:border-red-800/40 dark:bg-red-900/20">
        <div className="relative flex h-8 w-8 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-30" />
          <span className="relative flex h-3 w-3 rounded-full bg-red-500" />
        </div>
        <div className="flex flex-1 items-center gap-3">
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">Recording</span>
          <span className="font-mono text-sm tabular-nums text-slate-600 dark:text-slate-300">{formatTime(elapsed)}</span>
          <div className="flex items-end gap-[2px]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-red-400/80 dark:bg-red-500/70"
                style={{
                  height: `${6 + Math.random() * 14}px`,
                  animation: `pulse ${0.3 + i * 0.08}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={cancelRecording}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/80 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={stopRecording}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-all hover:scale-105 hover:bg-red-600"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'preview') {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200/60 bg-emerald-50/50 px-3 py-2.5 dark:border-emerald-800/40 dark:bg-emerald-900/20">
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onTimeUpdate={() => {
            if (audioRef.current) {
              setPlayProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0)
            }
          }}
          onEnded={() => { setPlaying(false); setPlayProgress(0) }}
        />

        <button
          type="button"
          onClick={togglePlayback}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm transition-all hover:bg-emerald-600"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>

        <div className="flex flex-1 items-end gap-[2px]" style={{ height: 28 }}>
          {waveBars.map((h, i) => (
            <div
              key={i}
              className={cn(
                'w-[3px] rounded-full transition-colors duration-100',
                i < filledBars ? 'bg-emerald-500' : 'bg-emerald-300/50 dark:bg-emerald-700/50',
              )}
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>

        <span className="ml-1 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {formatTime(elapsed)}
        </span>

        <button
          type="button"
          onClick={reRecord}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/80 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-300"
          title="Re-record"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={cancelRecording}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/80 hover:text-red-500 dark:hover:bg-white/10 dark:hover:text-red-400"
        >
          <X className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={sendVoiceNote}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md transition-all hover:scale-105 hover:bg-emerald-600"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
      <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
      <span className="text-sm text-slate-600 dark:text-slate-300">Sending voice note...</span>
    </div>
  )
}
