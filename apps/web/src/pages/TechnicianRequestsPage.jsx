import { Fragment, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  MessageCircle,
  MessageSquare,
  User,
  X as XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch, apiJson } from '@/lib/api'
import { cn } from '@/lib/utils'
import { SERVICE_MODES, SERVICE_REQUEST_STATUSES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'

const PAGE_SIZE = 10

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'completed', label: 'Completed' },
]

const STATUS_BADGE = {
  pending:
    'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800/60',
  accepted:
    'bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800/60',
  completed:
    'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/60',
  declined: 'bg-red-100 text-red-800 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800/60',
  cancelled: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600',
}

function statusLabel(status) {
  return SERVICE_REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status
}

function serviceModeLabel(mode) {
  if (!mode) return '—'
  return SERVICE_MODES.find((m) => m.value === mode)?.label ?? mode
}

function truncate(str, n) {
  if (!str) return ''
  return str.length <= n ? str : `${str.slice(0, n)}…`
}

function formatPreferredDate(d) {
  if (!d) return '—'
  const parsed = new Date(d)
  return Number.isNaN(parsed.getTime()) ? String(d) : parsed.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export function TechnicianRequestsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusTab, setStatusTab] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')

  const listQ = useQuery({
    queryKey: ['technician', 'requests', page, PAGE_SIZE, statusTab],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (statusTab !== 'all') params.set('status', statusTab)
      const raw = await apiFetch(`/technicians/me/requests?${params.toString()}`)
      const items = Array.isArray(raw?.data) ? raw.data : []
      const meta = raw?.meta ?? { page: 1, pageSize: PAGE_SIZE, total: items.length }
      return { items, meta }
    },
    placeholderData: keepPreviousData,
  })

  const items = useMemo(() => listQ.data?.items ?? [], [listQ.data])
  const meta = listQ.data?.meta ?? { page: 1, pageSize: PAGE_SIZE, total: 0 }
  const totalPages = Math.max(1, Math.ceil(meta.total / PAGE_SIZE))

  const updateM = useMutation({
    mutationFn: ({ id, body }) =>
      apiJson(`/technicians/me/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, vars) => {
      const labels = { accepted: 'Accepted', declined: 'Declined', completed: 'Marked complete' }
      toast.success(labels[vars.body.status] ?? 'Updated')
      qc.invalidateQueries({ queryKey: ['technician', 'requests'] })
      qc.invalidateQueries({ queryKey: ['technician', 'me', 'dashboard'] })
      setExpandedId(null)
    },
    onError: (e) => toast.error(e.message || 'Update failed'),
  })

  const busyId = useMemo(() => {
    if (!updateM.isPending || !updateM.variables?.id) return null
    return updateM.variables.id
  }, [updateM.isPending, updateM.variables?.id])

  const toggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    const r = items.find((x) => x.id === id)
    setNoteDraft(r?.technicianNote ?? '')
    setExpandedId(id)
  }

  const technicianNoteForRow = (reqId) => (expandedId === reqId ? noteDraft || undefined : undefined)

  return (
    <div className="animate-fade-in-up space-y-8 pb-2">
      <div className="space-y-2 border-b border-slate-200/80 pb-6 dark:border-slate-700/80">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Technician</p>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
              <ClipboardList className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Service Requests</h1>
              <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-400">
                Review bookings from buyers, accept or decline work, and mark jobs complete when finished.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const active = statusTab === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatusTab(tab.value)
                setPage(1)
              }}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {listQ.isLoading ? <LoadingSpinner label="Loading requests…" /> : null}

      {listQ.isError ? (
        <EmptyState
          title="Could not load requests"
          description={listQ.error?.message}
          className="dark:border-slate-700 dark:bg-slate-900/40"
        />
      ) : null}

      {!listQ.isLoading && !listQ.isError && items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No requests yet"
          description={
            statusTab === 'all'
              ? 'When buyers book you, their requests will show up here.'
              : `No ${statusTab} requests in this view.`
          }
          className="dark:border-slate-700 dark:bg-slate-900/40"
        />
      ) : null}

      {!listQ.isLoading && !listQ.isError && items.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Preferred</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="min-w-[220px] px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((req, i) => {
                  const open = expandedId === req.id
                  const buyer = req.buyerName ?? req.buyer_name ?? '—'
                  const desc = req.description ?? ''
                  const badgeClass = STATUS_BADGE[req.status] ?? STATUS_BADGE.cancelled
                  return (
                    <Fragment key={req.id}>
                      <tr
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleExpand(req.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggleExpand(req.id)
                          }
                        }}
                        className={cn(
                          'animate-fade-in-up cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/50',
                          open && 'bg-slate-50/90 dark:bg-slate-800/40',
                        )}
                        style={{ animationDelay: `${Math.min(i, 14) * 45}ms` }}
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                            <User className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                            <span className="truncate">{buyer}</span>
                          </div>
                        </td>
                        <td className="max-w-[220px] px-4 py-3 align-top text-slate-600 dark:text-slate-400">
                          <span className="line-clamp-2">{truncate(desc, 80)}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 align-top text-slate-600 dark:text-slate-400">
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                              {formatPreferredDate(req.preferredDate)}
                            </span>
                            {req.preferredTime ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-500">
                                <Clock className="h-3.5 w-3.5" aria-hidden />
                                {req.preferredTime}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            <Car className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                            <span className="max-w-[140px] truncate">{serviceModeLabel(req.serviceMode)}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                              badgeClass,
                            )}
                          >
                            {statusLabel(req.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <div className="flex flex-nowrap items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {req.status === 'pending' ? (
                              <>
                                <Button
                                  size="sm"
                                  className="gap-1"
                                  disabled={busyId === req.id}
                                  onClick={() =>
                                    updateM.mutate({
                                      id: req.id,
                                      body: { status: 'accepted', technicianNote: technicianNoteForRow(req.id) },
                                    })
                                  }
                                >
                                  <Check className="h-3.5 w-3.5" aria-hidden />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                                  disabled={busyId === req.id}
                                  onClick={() =>
                                    updateM.mutate({
                                      id: req.id,
                                      body: { status: 'declined', technicianNote: technicianNoteForRow(req.id) },
                                    })
                                  }
                                >
                                  <XIcon className="h-3.5 w-3.5" aria-hidden />
                                  Decline
                                </Button>
                              </>
                            ) : null}
                            {req.status === 'accepted' ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="gap-1"
                                disabled={busyId === req.id}
                                onClick={() =>
                                  updateM.mutate({
                                    id: req.id,
                                    body: { status: 'completed', technicianNote: technicianNoteForRow(req.id) },
                                  })
                                }
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                Complete
                              </Button>
                            ) : null}
                            <span className="inline-flex text-slate-400 dark:text-slate-500">
                              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="animate-fade-in-up border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/60">
                          <td colSpan={6} className="px-4 py-4">
                            <ExpandedBody req={req} noteDraft={noteDraft} setNoteDraft={setNoteDraft} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {items.map((req, i) => {
              const open = expandedId === req.id
              const buyer = req.buyerName ?? req.buyer_name ?? '—'
              const desc = req.description ?? ''
              const badgeClass = STATUS_BADGE[req.status] ?? STATUS_BADGE.cancelled
              return (
                <div
                  key={req.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(req.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleExpand(req.id)
                    }
                  }}
                  className={cn(
                    'animate-fade-in-up rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900',
                    open && 'ring-2 ring-brand-500/30 dark:ring-brand-500/25',
                  )}
                  style={{ animationDelay: `${Math.min(i, 14) * 45}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                        <User className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        <span className="truncate">{buyer}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{truncate(desc, 80)}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" aria-hidden />
                          {formatPreferredDate(req.preferredDate)}
                        </span>
                        {req.preferredTime ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" aria-hidden />
                            {req.preferredTime}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1">
                          <Car className="h-3.5 w-3.5" aria-hidden />
                          {serviceModeLabel(req.serviceMode)}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                          badgeClass,
                        )}
                      >
                        {statusLabel(req.status)}
                      </span>
                    </div>
                    <span className="shrink-0 text-slate-400">
                      {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    {req.status === 'pending' ? (
                      <>
                        <Button
                          size="sm"
                          className="gap-1"
                          disabled={busyId === req.id}
                          onClick={() =>
                            updateM.mutate({
                              id: req.id,
                              body: { status: 'accepted', technicianNote: technicianNoteForRow(req.id) },
                            })
                          }
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                          disabled={busyId === req.id}
                          onClick={() =>
                            updateM.mutate({
                              id: req.id,
                              body: { status: 'declined', technicianNote: technicianNoteForRow(req.id) },
                            })
                          }
                        >
                          <XIcon className="h-3.5 w-3.5" aria-hidden />
                          Decline
                        </Button>
                      </>
                    ) : null}
                    {req.status === 'accepted' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        disabled={busyId === req.id}
                        onClick={() =>
                          updateM.mutate({
                            id: req.id,
                            body: { status: 'completed', technicianNote: technicianNoteForRow(req.id) },
                          })
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        Complete
                      </Button>
                    ) : null}
                  </div>
                  {open ? (
                    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                      <ExpandedBody req={req} noteDraft={noteDraft} setNoteDraft={setNoteDraft} />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-200/80 pt-6 dark:border-slate-700/80 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Showing{' '}
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {meta.total === 0 ? 0 : (meta.page - 1) * PAGE_SIZE + 1}–{Math.min(meta.page * PAGE_SIZE, meta.total)}
              </span>{' '}
              of <span className="font-medium text-slate-900 dark:text-slate-100">{meta.total}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || listQ.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="px-2 text-sm tabular-nums text-slate-600 dark:text-slate-400">
                Page {meta.page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || listQ.isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function ExpandedBody({ req, noteDraft, setNoteDraft }) {
  const navigate = useNavigate()
  const [chatPending, setChatPending] = useState(false)

  const handleChat = async () => {
    setChatPending(true)
    try {
      const conv = await apiJson('/conversations', {
        method: 'POST',
        body: JSON.stringify({ buyerId: req.buyerId ?? req.buyer_id }),
      })
      navigate(`/messages/${conv.id}`)
    } catch (e) {
      toast.error(e.message ?? 'Could not start conversation')
    } finally {
      setChatPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <MessageSquare className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
            Full description
          </h3>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            disabled={chatPending}
            onClick={handleChat}
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            {chatPending ? 'Opening\u2026' : 'Chat with buyer'}
          </Button>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{req.description || '\u2014'}</p>
      </div>
      {req.vehicleInfo ? (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Car className="h-4 w-4 text-slate-400" aria-hidden />
            Vehicle
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{req.vehicleInfo}</p>
        </div>
      ) : null}
      <div>
        <label htmlFor={`tech-note-${req.id}`} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Technician note
        </label>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-500">Optional — sent when you accept, decline, or complete.</p>
        <textarea
          id={`tech-note-${req.id}`}
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          rows={4}
          className={cn(
            'mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900',
            'placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
            'dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600',
          )}
          placeholder="Add context for the buyer (optional)\u2026"
        />
      </div>
    </div>
  )
}
