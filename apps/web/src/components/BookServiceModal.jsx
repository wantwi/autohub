import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation } from '@tanstack/react-query'
import { Calendar, Clock, X } from 'lucide-react'
import { toast } from 'sonner'
import { apiJson } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const TIME_SLOTS = [
  { value: 'Morning', label: 'Morning' },
  { value: 'Afternoon', label: 'Afternoon' },
  { value: 'Evening', label: 'Evening' },
]

export function BookServiceModal({ technicianId, technicianName, onClose }) {
  const [description, setDescription] = useState('')
  const [vehicleInfo, setVehicleInfo] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [serviceMode, setServiceMode] = useState('mobile')

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const mutation = useMutation({
    mutationFn: (body) =>
      apiJson('/service-requests', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Service request submitted')
      onClose()
    },
    onError: (e) => toast.error(e.message),
  })

  function handleSubmit(e) {
    e.preventDefault()
    const desc = description.trim()
    if (!desc) {
      toast.error('Please describe the service you need')
      return
    }
    mutation.mutate({
      technicianId,
      description: desc,
      vehicleInfo: vehicleInfo.trim() || null,
      preferredDate: preferredDate.trim() || null,
      preferredTime: preferredTime.trim() || null,
      serviceMode,
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm dark:bg-slate-950/80"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-service-title"
        className={cn(
          'relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/50',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="min-w-0">
            <h2 id="book-service-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Book a service
            </h2>
            {technicianName ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">with {technicianName}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="space-y-5 p-5">
            <div className="space-y-2">
              <Label htmlFor="svc-desc">Description *</Label>
              <textarea
                id="svc-desc"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What work do you need?"
                className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500 dark:focus-visible:ring-slate-100/10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-vehicle">Vehicle info (optional)</Label>
              <Input
                id="svc-vehicle"
                value={vehicleInfo}
                onChange={(e) => setVehicleInfo(e.target.value)}
                placeholder="Make, model, year..."
                className="dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="svc-date" className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  Preferred date
                </Label>
                <Input
                  id="svc-date"
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-time" className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  Preferred time
                </Label>
                <select
                  id="svc-time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:focus-visible:ring-slate-100/10"
                >
                  <option value="">Select…</option>
                  {TIME_SLOTS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-slate-900 dark:text-slate-200">Service mode</legend>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="serviceMode"
                    value="mobile"
                    checked={serviceMode === 'mobile'}
                    onChange={() => setServiceMode('mobile')}
                    className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900"
                  />
                  Mobile (they come to you)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="serviceMode"
                    value="workshop"
                    checked={serviceMode === 'workshop'}
                    onChange={() => setServiceMode('workshop')}
                    className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900"
                  />
                  Workshop (you go to them)
                </label>
              </div>
            </fieldset>
          </div>

          <div className="mt-auto flex justify-end gap-2 border-t border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/50">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Submitting…' : 'Submit request'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
