import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Bug, Lightbulb, MessageSquare, Send, CheckCircle2 } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const FEEDBACK_TYPES = [
  { key: 'bug', label: 'Bug Report', icon: Bug, desc: 'Something isn\'t working', color: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400' },
  { key: 'feature', label: 'Feature Request', icon: Lightbulb, desc: 'Suggest an improvement', color: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400' },
  { key: 'general', label: 'General Feedback', icon: MessageSquare, desc: 'Share your thoughts', color: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/30 dark:text-sky-400' },
]

export function FeedbackPage() {
  const [type, setType] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = useMutation({
    mutationFn: (body) => apiJson('/feedback', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      setSubmitted(true)
      setMessage('')
      setType('')
    },
    onError: (e) => toast.error(e.message),
  })

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">Thank you!</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Your feedback has been received. We appreciate you taking the time to help us improve AutoHub.
        </p>
        <Button className="mt-6" onClick={() => setSubmitted(false)}>
          Send more feedback
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Help us improve</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Send Feedback</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Found a bug? Have a suggestion? We'd love to hear from you.
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">What type of feedback?</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {FEEDBACK_TYPES.map((ft) => (
            <button
              key={ft.key}
              type="button"
              onClick={() => setType(ft.key)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-center transition-all',
                type === ft.key
                  ? ft.color
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600',
              )}
            >
              <ft.icon className="h-5 w-5" />
              <span className="text-xs font-semibold">{ft.label}</span>
              <span className="text-[10px] opacity-70">{ft.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Your message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder={
            type === 'bug' ? 'Describe what happened and what you expected...'
              : type === 'feature' ? 'Describe the feature you\'d like to see...'
              : 'Share your thoughts with us...'
          }
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-600"
        />
      </div>

      <Button
        onClick={() => submit.mutate({ type: type || 'general', message })}
        disabled={!message.trim() || submit.isPending}
        className="w-full gap-2"
        size="lg"
      >
        <Send className="h-4 w-4" />
        {submit.isPending ? 'Sending...' : 'Send Feedback'}
      </Button>
    </div>
  )
}
