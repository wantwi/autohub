import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Flag, X } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Harassment' },
  { key: 'scam', label: 'Scam / Fraud' },
  { key: 'inappropriate', label: 'Inappropriate Content' },
  { key: 'fake_profile', label: 'Fake Profile' },
  { key: 'other', label: 'Other' },
]

export function ReportDialog({ reportedUserId, conversationId, onClose }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')

  const submit = useMutation({
    mutationFn: (body) => apiJson('/reports', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Report submitted. Our team will review it.')
      onClose()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm animate-fade-in-up rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <Flag className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Report User</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Select a reason for the report. Our team will review it and take action if needed.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {REASONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setReason(r.key)}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                reason === r.key
                  ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-400'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Additional details (optional)..."
          rows={2}
          className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
        />

        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => submit.mutate({ reportedUserId, conversationId, reason, details: details || undefined })}
            disabled={!reason || submit.isPending}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {submit.isPending ? 'Sending...' : 'Submit Report'}
          </Button>
        </div>
      </div>
    </div>
  )
}
