import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Store,
  Trash2,
  Upload,
  UserPlus,
  Wrench,
  XCircle,
} from 'lucide-react'
import { apiJson, apiUpload, apiDownload } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Stepper } from '@/components/ui/stepper'
import { toast } from 'sonner'
import { SPECIALIZATIONS, SERVICE_MODES } from '@/lib/constants'
import { cn } from '@/lib/utils'
const PAGE_SIZE = 10
const STATUS_FILTERS = ['all', 'approved', 'pending', 'rejected']
const STATUS_OPTIONS = ['approved', 'pending', 'rejected']
const STEPPER_STEPS = [{ label: 'Dealer info' }, { label: 'Business info' }]

const statusColor = {
  approved:
    'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-500/30',
  pending:
    'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-600/40',
  rejected:
    'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-600/40',
}

const TABS = [
  { key: 'dealers', label: 'Dealers', icon: Store },
  { key: 'technicians', label: 'Technicians', icon: Wrench },
]

export function AdminOnboardingPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('dealers')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [step, setStep] = useState(0)

  const params = new URLSearchParams({ page, pageSize: PAGE_SIZE })
  if (search) params.set('q', search)
  if (statusFilter !== 'all') params.set('status', statusFilter)

  const dealersQ = useQuery({
    queryKey: ['admin', 'dealers', page, search, statusFilter],
    queryFn: () => apiJson(`/dealers/admin/list?${params.toString()}`),
    keepPreviousData: true,
  })

  const onboardM = useMutation({
    mutationFn: (body) =>
      apiJson('/dealers/admin/onboard', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Dealer created successfully')
      reset()
      setStep(0)
      setModalOpen(false)
      qc.invalidateQueries({ queryKey: ['admin', 'dealers'] })
    },
    onError: (e) => toast.error(e.message || 'Onboarding failed'),
  })

  const updateM = useMutation({
    mutationFn: ({ id, body }) =>
      apiJson(`/dealers/admin/${id}/onboarding`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['admin', 'dealers'] })
    },
    onError: (e) => toast.error(e.message || 'Update failed'),
  })

  const verifyM = useMutation({
    mutationFn: (id) => apiJson(`/dealers/${id}/verify`, { method: 'PATCH' }),
    onSuccess: (data) => {
      toast.success(data?.isVerified ? 'Dealer verified' : 'Dealer unverified')
      qc.invalidateQueries({ queryKey: ['admin', 'dealers'] })
    },
    onError: (e) => toast.error(e.message || 'Verification failed'),
  })

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      shopName: '',
      phoneBusiness: '',
      locationText: '',
      description: '',
      onboardingStatus: 'approved',
      onboardingNote: '',
    },
  })

  const raw = dealersQ.data
  const dealers = useMemo(() => {
    if (Array.isArray(raw)) return raw
    if (raw?.data && Array.isArray(raw.data)) return raw.data
    return []
  }, [raw])
  const meta = raw?.meta ?? { page: 1, pageSize: PAGE_SIZE, total: dealers.length }
  const totalPages = Math.max(1, Math.ceil(meta.total / PAGE_SIZE))

  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkFile, setBulkFile] = useState(null)
  const [bulkResult, setBulkResult] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const fileInputRef = useRef(null)

  const bulkUploadM = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('file', file)
      return apiUpload('/dealers/admin/onboard-bulk', fd)
    },
    onSuccess: (data) => {
      setBulkResult(data)
      qc.invalidateQueries({ queryKey: ['admin', 'dealers'] })
    },
    onError: (e) => toast.error(e.message || 'Bulk upload failed'),
  })

  const handleDownloadTemplate = useCallback(async () => {
    setDownloading(true)
    try {
      await apiDownload('/dealers/admin/onboard-template', 'dealer-onboarding-template.xlsx')
    } catch {
      toast.error('Failed to download template')
    } finally {
      setDownloading(false)
    }
  }, [])

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) setBulkFile(f)
  }

  const openBulkModal = () => {
    setBulkFile(null)
    setBulkResult(null)
    setBulkModalOpen(true)
  }

  const closeBulkModal = () => {
    setBulkModalOpen(false)
    setBulkFile(null)
    setBulkResult(null)
  }

  const [partsModalOpen, setPartsModalOpen] = useState(false)
  const [partsDealer, setPartsDealer] = useState(null)

  const partsQ = useQuery({
    queryKey: ['admin', 'dealer-parts', partsDealer?.id],
    queryFn: () => apiJson(`/admin/dealers/${partsDealer.id}/parts`),
    enabled: !!partsDealer?.id && partsModalOpen,
  })

  const openPartsModal = (dealer) => {
    setPartsDealer(dealer)
    setPartsModalOpen(true)
  }

  const closePartsModal = () => {
    setPartsModalOpen(false)
    setPartsDealer(null)
  }

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editDealer, setEditDealer] = useState(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteDealer, setDeleteDealer] = useState(null)

  const editForm = useForm()

  const editM = useMutation({
    mutationFn: ({ id, body }) =>
      apiJson(`/dealers/admin/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Dealer updated successfully')
      setEditModalOpen(false)
      setEditDealer(null)
      qc.invalidateQueries({ queryKey: ['admin', 'dealers'] })
    },
    onError: (e) => toast.error(e.message || 'Update failed'),
  })

  const deleteM = useMutation({
    mutationFn: (id) => apiJson(`/dealers/admin/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Dealer deleted successfully')
      setDeleteModalOpen(false)
      setDeleteDealer(null)
      qc.invalidateQueries({ queryKey: ['admin', 'dealers'] })
    },
    onError: (e) => toast.error(e.message || 'Delete failed'),
  })

  const openEditModal = (dealer) => {
    setEditDealer(dealer)
    editForm.reset({
      fullName: dealer.userFullName || '',
      phone: dealer.userPhone || '',
      email: dealer.userEmail || '',
      shopName: dealer.shopName || '',
      phoneBusiness: dealer.phoneBusiness || '',
      locationText: dealer.locationText || '',
      description: dealer.description || '',
      onboardingStatus: dealer.onboardingStatus || 'approved',
    })
    setEditModalOpen(true)
  }

  const openDeleteModal = (dealer) => {
    setDeleteDealer(dealer)
    setDeleteModalOpen(true)
  }

  const onEditSubmit = (vals) => {
    editM.mutate({
      id: editDealer.id,
      body: {
        fullName: vals.fullName,
        phone: vals.phone,
        email: vals.email || null,
        shopName: vals.shopName,
        phoneBusiness: vals.phoneBusiness,
        locationText: vals.locationText,
        description: vals.description || null,
        onboardingStatus: vals.onboardingStatus,
      },
    })
  }

  const openModal = () => {
    reset()
    setStep(0)
    setModalOpen(true)
  }

  const handleNextStep = async () => {
    const valid = await trigger(['fullName', 'phone'])
    if (valid) setStep(1)
  }

  const onSubmit = (vals) => {
    onboardM.mutate({
      fullName: vals.fullName,
      phone: vals.phone,
      email: vals.email || undefined,
      shopName: vals.shopName,
      phoneBusiness: vals.phoneBusiness,
      locationText: vals.locationText,
      description: vals.description || undefined,
      onboardingStatus: vals.onboardingStatus,
      onboardingNote: vals.onboardingNote || undefined,
    })
  }

  return (
    <div className="space-y-4">
      {/* Tab toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setActiveTab(t.key); setPage(1); setSearch(''); setStatusFilter('all') }}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === t.key
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'dealers' && (<>
      {/* Dealer Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Dealer management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {meta.total} dealer{meta.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openBulkModal} className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4" />
            Bulk upload
          </Button>
          <Button onClick={openModal} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add dealer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search name, shop, phone..."
            className="h-9 pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatusFilter(s)
                setPage(1)
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {dealersQ.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : dealers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Store className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">No dealers found</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Click "Add dealer" to create the first one.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="whitespace-nowrap px-5 py-4">Shop name</th>
                  <th className="whitespace-nowrap px-5 py-4">Owner</th>
                  <th className="whitespace-nowrap px-5 py-4">Phone</th>
                  <th className="whitespace-nowrap px-5 py-4">Location</th>
                  <th className="whitespace-nowrap px-5 py-4">Status</th>
                  <th className="whitespace-nowrap px-5 py-4 text-center">Verified</th>
                  <th className="whitespace-nowrap px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {dealers.map((d) => (
                  <tr key={d.id} className="group transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900 dark:text-slate-100">
                      {d.shopName}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-400">
                      {d.userFullName || '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-400">
                      {d.userPhone || d.phoneBusiness || '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-400">
                      {d.locationText || '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${
                          statusColor[d.onboardingStatus] ||
                          'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600'
                        }`}
                      >
                        {d.onboardingStatus}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-center">
                      <button
                        type="button"
                        title={d.isVerified ? 'Click to unverify' : 'Click to verify'}
                        disabled={verifyM.isPending}
                        onClick={() => verifyM.mutate(d.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-colors ${
                          d.isVerified
                            ? 'bg-brand-50 text-brand-700 ring-brand-200 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-500/30 dark:hover:bg-brand-500/20'
                            : 'bg-slate-50 text-slate-400 ring-slate-200 hover:bg-slate-100 hover:text-slate-600 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-400'
                        }`}
                      >
                        {d.isVerified ? (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        ) : (
                          <ShieldOff className="h-3.5 w-3.5" />
                        )}
                        {d.isVerified ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="View parts"
                          onClick={() => openPartsModal(d)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:text-slate-500 dark:hover:bg-brand-500/15 dark:hover:text-brand-400"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Edit dealer"
                          onClick={() => openEditModal(d)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete dealer"
                          onClick={() => openDeleteModal(d)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {dealers.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {(meta.page - 1) * PAGE_SIZE + 1}–{Math.min(meta.page * PAGE_SIZE, meta.total)}
              </span>{' '}
              of <span className="font-semibold text-slate-700 dark:text-slate-300">{meta.total}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1),
                )
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`e${i}`} className="px-1 text-xs text-slate-400 dark:text-slate-500">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`h-7 min-w-7 rounded-md px-2 text-xs font-medium transition-colors ${
                        p === page
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Dealer Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} className="max-w-md">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Add new dealer</h2>
            <div className="mt-3">
              <Stepper steps={STEPPER_STEPS} current={step} />
            </div>
          </ModalHeader>

          <ModalBody>
            {step === 0 && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>
                    Full name <span className="text-red-500 dark:text-red-400">*</span>
                  </Label>
                  <Input
                    {...register('fullName', { required: 'Full name is required' })}
                    placeholder="Dealer's full name"
                    className="h-9"
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-500 dark:text-red-400">{errors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>
                    Phone <span className="text-red-500 dark:text-red-400">*</span>
                  </Label>
                  <Input
                    {...register('phone', { required: 'Phone is required' })}
                    placeholder="+233 XX XXX XXXX"
                    className="h-9"
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-500 dark:text-red-400">{errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder="Optional"
                    className="h-9"
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>
                    Shop name <span className="text-red-500 dark:text-red-400">*</span>
                  </Label>
                  <Input
                    {...register('shopName', { required: 'Shop name is required' })}
                    placeholder="Shop display name"
                    className="h-9"
                  />
                  {errors.shopName && (
                    <p className="text-xs text-red-500 dark:text-red-400">{errors.shopName.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>
                    Business phone <span className="text-red-500 dark:text-red-400">*</span>
                  </Label>
                  <Input
                    {...register('phoneBusiness', { required: 'Business phone is required' })}
                    placeholder="Shop contact number"
                    className="h-9"
                  />
                  {errors.phoneBusiness && (
                    <p className="text-xs text-red-500 dark:text-red-400">{errors.phoneBusiness.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>
                    Location <span className="text-red-500 dark:text-red-400">*</span>
                  </Label>
                  <Input
                    {...register('locationText', { required: 'Location is required' })}
                    placeholder="e.g. Abossey Okai, Accra"
                    className="h-9"
                  />
                  {errors.locationText && (
                    <p className="text-xs text-red-500 dark:text-red-400">{errors.locationText.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input
                    {...register('description')}
                    placeholder="Brief shop overview (optional)"
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Initial status</Label>
                    <select
                      className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm capitalize dark:border-slate-600 dark:bg-slate-900"
                      {...register('onboardingStatus')}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Admin note</Label>
                    <Input
                      {...register('onboardingNote')}
                      placeholder="Internal note"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            {step === 0 ? (
              <>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleNextStep} className="gap-1.5">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(0)} className="gap-1.5">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={onboardM.isPending} className="gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  {onboardM.isPending ? 'Creating...' : 'Create dealer'}
                </Button>
              </>
            )}
          </ModalFooter>
        </form>
      </Modal>

      {/* View Parts Modal */}
      <Modal open={partsModalOpen} onClose={closePartsModal} className="max-w-2xl">
        <ModalHeader>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Parts — {partsDealer?.shopName}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            All parts listed by this dealer
          </p>
        </ModalHeader>
        <ModalBody>
          {partsQ.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : !partsQ.data?.length && !Array.isArray(partsQ.data) && partsQ.data?.length === undefined ? (
            <div className="py-10 text-center">
              <Boxes className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">No parts uploaded</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">This dealer has not uploaded any parts yet.</p>
            </div>
          ) : (() => {
            const parts = Array.isArray(partsQ.data) ? partsQ.data : []
            if (!parts.length) {
              return (
                <div className="py-10 text-center">
                  <Boxes className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">No parts uploaded</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">This dealer has not uploaded any parts yet.</p>
                </div>
              )
            }
            return (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      <th className="whitespace-nowrap px-4 py-3">Part name</th>
                      <th className="whitespace-nowrap px-4 py-3">Category</th>
                      <th className="whitespace-nowrap px-4 py-3">Condition</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right">Price</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center">Qty</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center">Visible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {parts.map((p) => (
                      <tr key={p.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{p.name}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 capitalize dark:text-slate-400">{p.category}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ${
                            p.condition === 'new'
                              ? 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-500/30'
                              : p.condition === 'used'
                                ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-600/40'
                                : 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-500/30'
                          }`}>
                            {p.condition}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                          GH₵ {Number(p.price).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-slate-600 dark:text-slate-400">{p.quantity}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          {(p.isAvailable ?? p.is_available) ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                              <XCircle className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </ModalBody>
        <ModalFooter>
          <p className="mr-auto text-xs text-slate-400 dark:text-slate-500">
            {Array.isArray(partsQ.data) ? partsQ.data.length : 0} part{(Array.isArray(partsQ.data) ? partsQ.data.length : 0) !== 1 ? 's' : ''} total
          </p>
          <Button type="button" variant="outline" onClick={closePartsModal}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Dealer Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} className="max-w-lg">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={editForm.handleSubmit(onEditSubmit)}>
          <ModalHeader>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Edit dealer</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Update details for {editDealer?.shopName || 'this dealer'}
            </p>
          </ModalHeader>

          <ModalBody>
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Personal info</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Full name <span className="text-red-500 dark:text-red-400">*</span></Label>
                  <Input
                    {...editForm.register('fullName', { required: 'Required' })}
                    className="h-9"
                  />
                  {editForm.formState.errors.fullName && (
                    <p className="text-xs text-red-500 dark:text-red-400">{editForm.formState.errors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Phone <span className="text-red-500 dark:text-red-400">*</span></Label>
                  <Input
                    {...editForm.register('phone', { required: 'Required' })}
                    className="h-9"
                  />
                  {editForm.formState.errors.phone && (
                    <p className="text-xs text-red-500 dark:text-red-400">{editForm.formState.errors.phone.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input {...editForm.register('email')} type="email" placeholder="Optional" className="h-9" />
              </div>

              <hr className="border-slate-100 dark:border-slate-700" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Business info</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Shop name <span className="text-red-500 dark:text-red-400">*</span></Label>
                  <Input
                    {...editForm.register('shopName', { required: 'Required' })}
                    className="h-9"
                  />
                  {editForm.formState.errors.shopName && (
                    <p className="text-xs text-red-500 dark:text-red-400">{editForm.formState.errors.shopName.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Business phone <span className="text-red-500 dark:text-red-400">*</span></Label>
                  <Input
                    {...editForm.register('phoneBusiness', { required: 'Required' })}
                    className="h-9"
                  />
                  {editForm.formState.errors.phoneBusiness && (
                    <p className="text-xs text-red-500 dark:text-red-400">{editForm.formState.errors.phoneBusiness.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Location <span className="text-red-500 dark:text-red-400">*</span></Label>
                <Input
                  {...editForm.register('locationText', { required: 'Required' })}
                  placeholder="e.g. Abossey Okai, Accra"
                  className="h-9"
                />
                {editForm.formState.errors.locationText && (
                  <p className="text-xs text-red-500 dark:text-red-400">{editForm.formState.errors.locationText.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <textarea
                  {...editForm.register('description')}
                  rows={2}
                  placeholder="Brief shop overview"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-900 dark:focus:ring-brand-500/10"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select
                  className="h-9 w-full max-w-[200px] rounded-md border border-slate-300 px-3 text-sm capitalize dark:border-slate-600 dark:bg-slate-900"
                  {...editForm.register('onboardingStatus')}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={editM.isPending} className="gap-1.5">
              <Pencil className="h-4 w-4" />
              {editM.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} className="max-w-sm">
        <ModalHeader>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Delete dealer</h2>
        </ModalHeader>
        <ModalBody>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
              <Trash2 className="h-5 w-5 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Are you sure you want to delete{' '}
                <span className="font-semibold">{deleteDealer?.shopName}</span>? This will remove
                the dealer profile and reset the associated user's role back to buyer.
              </p>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">This action cannot be undone.</p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={deleteM.isPending}
            onClick={() => deleteM.mutate(deleteDealer?.id)}
            className="gap-1.5 bg-red-600 text-white hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" />
            {deleteM.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal open={bulkModalOpen} onClose={closeBulkModal} className="max-w-md">
        <ModalHeader>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Bulk dealer onboarding</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Download the template, fill in dealer data, then upload to onboard in bulk.
          </p>
        </ModalHeader>

        <ModalBody>
          {bulkResult ? (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/15">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  <p className="text-sm font-semibold text-brand-800 dark:text-brand-400">
                    {bulkResult.created} of {bulkResult.total} dealers created
                  </p>
                </div>
              </div>

              {bulkResult.failed > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/40 dark:bg-red-900/30">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      {bulkResult.failed} row{bulkResult.failed !== 1 ? 's' : ''} failed
                    </p>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {bulkResult.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
                        <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 font-mono font-semibold dark:bg-red-900/20">
                          Row {err.row}
                        </span>
                        <span>{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Step 1: Download template */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                    1
                  </span>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Download template</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloading}
                  onClick={handleDownloadTemplate}
                  className="ml-8 gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  {downloading ? 'Downloading...' : 'Download Excel template'}
                </Button>
              </div>

              {/* Step 2: Upload file */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                    2
                  </span>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Upload filled template</p>
                </div>
                <div className="ml-8">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-sm transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                  >
                    {bulkFile ? (
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <FileSpreadsheet className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                        <span className="font-medium">{bulkFile.name}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">({(bulkFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="mx-auto h-6 w-6 text-slate-400 dark:text-slate-500" />
                        <p className="mt-1 text-slate-500 dark:text-slate-400">Click to choose an .xlsx file</p>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          {bulkResult ? (
            <Button type="button" onClick={closeBulkModal}>
              Done
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={closeBulkModal}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!bulkFile || bulkUploadM.isPending}
                onClick={() => bulkUploadM.mutate(bulkFile)}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" />
                {bulkUploadM.isPending ? 'Processing...' : 'Upload and process'}
              </Button>
            </>
          )}
        </ModalFooter>
      </Modal>
      </>)}

      {activeTab === 'technicians' && (
        <TechnicianOnboarding qc={qc} page={page} setPage={setPage} search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
      )}
    </div>
  )
}

function TechnicianOnboarding({ qc, page, setPage, search, setSearch, statusFilter, setStatusFilter }) {
  const params = new URLSearchParams({ page, pageSize: PAGE_SIZE })
  if (search) params.set('q', search)
  if (statusFilter !== 'all') params.set('status', statusFilter)

  const techQ = useQuery({
    queryKey: ['admin', 'technicians', page, search, statusFilter],
    queryFn: () => apiJson(`/technicians/admin/list?${params.toString()}`),
    keepPreviousData: true,
  })

  const raw = techQ.data
  const technicians = useMemo(() => {
    if (Array.isArray(raw)) return raw
    if (raw?.data && Array.isArray(raw.data)) return raw.data
    return []
  }, [raw])
  const meta = raw?.meta ?? { page: 1, pageSize: PAGE_SIZE, total: technicians.length }
  const totalPages = Math.max(1, Math.ceil(meta.total / PAGE_SIZE))

  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTech, setEditTech] = useState(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTech, setDeleteTech] = useState(null)

  const addSpecsLabelId = useId()
  const editSpecsLabelId = useId()

  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm({
    defaultValues: {
      fullName: '', phone: '', email: '',
      displayName: '', phoneBusiness: '', locationText: '', description: '',
      specializations: [], serviceMode: 'both',
      onboardingStatus: 'approved', onboardingNote: '',
    },
  })

  const editForm = useForm()
  const { errors: editErrors } = editForm.formState
  const selectedSpecs = watch('specializations') || []
  const editSpecs = editForm.watch('specializations') || []

  const onboardM = useMutation({
    mutationFn: (body) =>
      apiJson('/technicians/admin/onboard', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Technician created successfully')
      reset(); setModalOpen(false)
      qc.invalidateQueries({ queryKey: ['admin', 'technicians'] })
    },
    onError: (e) => toast.error(e.message || 'Onboarding failed'),
  })

  const updateM = useMutation({
    mutationFn: ({ id, body }) =>
      apiJson(`/technicians/admin/${id}/onboarding`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['admin', 'technicians'] })
    },
    onError: (e) => toast.error(e.message || 'Update failed'),
  })

  const verifyM = useMutation({
    mutationFn: (id) => apiJson(`/technicians/${id}/verify`, { method: 'PATCH' }),
    onSuccess: (data) => {
      toast.success(data?.isVerified ? 'Technician verified' : 'Technician unverified')
      qc.invalidateQueries({ queryKey: ['admin', 'technicians'] })
    },
    onError: (e) => toast.error(e.message || 'Verification failed'),
  })

  const editM = useMutation({
    mutationFn: ({ id, body }) =>
      apiJson(`/technicians/admin/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Technician updated')
      setEditModalOpen(false); setEditTech(null)
      qc.invalidateQueries({ queryKey: ['admin', 'technicians'] })
    },
    onError: (e) => toast.error(e.message || 'Update failed'),
  })

  const deleteM = useMutation({
    mutationFn: (id) => apiJson(`/technicians/admin/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Technician deleted')
      setDeleteModalOpen(false); setDeleteTech(null)
      qc.invalidateQueries({ queryKey: ['admin', 'technicians'] })
    },
    onError: (e) => toast.error(e.message || 'Delete failed'),
  })

  const openModal = () => {
    reset()
    setModalOpen(true)
  }

  const onSubmit = (vals) => {
    onboardM.mutate({
      fullName: vals.fullName, phone: vals.phone, email: vals.email || undefined,
      displayName: vals.displayName, phoneBusiness: vals.phoneBusiness,
      specializations: vals.specializations, serviceMode: vals.serviceMode,
      locationText: vals.locationText, description: vals.description || undefined,
      onboardingStatus: vals.onboardingStatus, onboardingNote: vals.onboardingNote || undefined,
    })
  }

  const openEditModal = (t) => {
    setEditTech(t)
    editForm.reset({
      fullName: t.userFullName || '', phone: t.userPhone || '', email: t.userEmail || '',
      displayName: t.displayName || '', phoneBusiness: t.phoneBusiness || '',
      specializations: t.specializations || [], serviceMode: t.serviceMode || 'both',
      locationText: t.locationText || '', description: t.description || '',
      onboardingStatus: t.onboardingStatus || 'approved',
    })
    setEditModalOpen(true)
  }

  const onEditSubmit = (vals) => {
    editM.mutate({
      id: editTech.id,
      body: {
        fullName: vals.fullName, phone: vals.phone, email: vals.email || null,
        displayName: vals.displayName, phoneBusiness: vals.phoneBusiness,
        specializations: vals.specializations, serviceMode: vals.serviceMode,
        locationText: vals.locationText, description: vals.description || null,
        onboardingStatus: vals.onboardingStatus,
      },
    })
  }

  const toggleSpec = (arr, setArr, val) => {
    const next = arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
    setArr('specializations', next)
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Technician management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {meta.total} technician{meta.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button onClick={openModal} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add technician
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search name, phone..." className="h-9 pl-9" />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
          {STATUS_FILTERS.map((s) => (
            <button key={s} type="button" onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            >{s}</button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {techQ.isLoading ? (
          <div className="flex items-center justify-center py-16"><LoadingSpinner /></div>
        ) : technicians.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Wrench className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">No technicians found</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              {search || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Click "Add technician" to create the first one.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  <th className="whitespace-nowrap px-5 py-4">Display name</th>
                  <th className="whitespace-nowrap px-5 py-4">Owner</th>
                  <th className="whitespace-nowrap px-5 py-4">Specializations</th>
                  <th className="whitespace-nowrap px-5 py-4">Location</th>
                  <th className="whitespace-nowrap px-5 py-4">Status</th>
                  <th className="whitespace-nowrap px-5 py-4 text-center">Verified</th>
                  <th className="whitespace-nowrap px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {technicians.map((t) => (
                  <tr key={t.id} className="group transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900 dark:text-slate-100">{t.displayName}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-400">{t.userFullName || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(t.specializations || []).slice(0, 3).map((s) => (
                          <span key={s} className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700 ring-1 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-500/30">
                            {SPECIALIZATIONS.find((sp) => sp.value === s)?.label || s}
                          </span>
                        ))}
                        {(t.specializations || []).length > 3 && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">+{t.specializations.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-400">{t.locationText || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusColor[t.onboardingStatus] || 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600'}`}>
                        {t.onboardingStatus}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-center">
                      <button type="button" title={t.isVerified ? 'Click to unverify' : 'Click to verify'} disabled={verifyM.isPending} onClick={() => verifyM.mutate(t.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-colors ${t.isVerified ? 'bg-brand-50 text-brand-700 ring-brand-200 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-500/30' : 'bg-slate-50 text-slate-400 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-600'}`}>
                        {t.isVerified ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                        {t.isVerified ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" title="Edit technician" onClick={() => openEditModal(t)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" title="Delete technician" onClick={() => { setDeleteTech(t); setDeleteModalOpen(true) }}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-900/30 dark:hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {technicians.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{(meta.page - 1) * PAGE_SIZE + 1}–{Math.min(meta.page * PAGE_SIZE, meta.total)}</span> of <span className="font-semibold text-slate-700 dark:text-slate-300">{meta.total}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-7 w-7 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push('...'); acc.push(p); return acc }, [])
                .map((p, i) =>
                  p === '...' ? <span key={`e${i}`} className="px-1 text-xs text-slate-400 dark:text-slate-500">...</span> : (
                    <button key={p} type="button" onClick={() => setPage(p)}
                      className={`h-7 min-w-7 rounded-md px-2 text-xs font-medium transition-colors ${p === page ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>{p}</button>
                  )
                )}
              <Button type="button" size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="h-7 w-7 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Technician Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} className="max-w-2xl">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Add new technician</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Personal and service details. Operating hours can be set later in the technician&apos;s profile.
            </p>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Personal info</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Full name <span className="text-red-500 dark:text-red-400">*</span></Label>
                  <Input {...register('fullName', { required: 'Full name is required' })} placeholder="Technician's full name" className="h-9" />
                  {errors.fullName && <p className="text-xs text-red-500 dark:text-red-400">{errors.fullName.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Phone <span className="text-red-500 dark:text-red-400">*</span></Label>
                  <Input
                    {...register('phone', { required: 'Phone is required' })}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+233 XX XXX XXXX"
                    className="h-9"
                  />
                  {errors.phone && <p className="text-xs text-red-500 dark:text-red-400">{errors.phone.message}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  {...register('email', {
                    validate: (v) =>
                      !v?.trim() ||
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ||
                      'Enter a valid email address',
                  })}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Optional"
                  className="h-9"
                />
                {errors.email && <p className="text-xs text-red-500 dark:text-red-400">{errors.email.message}</p>}
              </div>

              <hr className="border-slate-100 dark:border-slate-700" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Service info</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Display name <span className="text-red-500 dark:text-red-400">*</span></Label>
                  <Input {...register('displayName', { required: 'Display name is required' })} placeholder="Business / trade name" className="h-9" />
                  {errors.displayName && <p className="text-xs text-red-500 dark:text-red-400">{errors.displayName.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Business phone</Label>
                  <Input
                    {...register('phoneBusiness')}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Shop contact"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1" role="group" aria-labelledby={addSpecsLabelId}>
                <Label id={addSpecsLabelId}>
                  Specializations <span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400">Choose every trade this technician offers.</p>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS.map((s) => {
                    const on = selectedSpecs.includes(s.value)
                    return (
                      <button
                        key={s.value}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${on ? 'Remove' : 'Add'} ${s.label}`}
                        onClick={() => toggleSpec(selectedSpecs, setValue, s.value)}
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
                          on
                            ? 'bg-brand-600 text-white ring-brand-600'
                            : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600 dark:hover:bg-slate-700',
                        )}
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </div>
                {selectedSpecs.length === 0 && <p className="text-xs text-red-500 dark:text-red-400">Select at least one specialization</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Service mode</Label>
                  <select className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" {...register('serviceMode')}>
                    {SERVICE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Location</Label>
                  <Input {...register('locationText')} placeholder="e.g. Kaneshie, Accra" className="h-9" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <textarea {...register('description')} rows={2} placeholder="Brief expertise description..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-brand-500/10" />
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Admin</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Initial status</Label>
                  <select className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm capitalize dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" {...register('onboardingStatus')}>
                    {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Admin note</Label>
                  <Input {...register('onboardingNote')} placeholder="Internal note" className="h-9" />
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={onboardM.isPending || selectedSpecs.length === 0} className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              {onboardM.isPending ? 'Creating...' : 'Create technician'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit Technician Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} className="max-w-2xl">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={editForm.handleSubmit(onEditSubmit)}>
          <ModalHeader>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Edit technician</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Update details for {editTech?.displayName || 'this technician'}. Operating hours stay editable in their profile.
            </p>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Personal info</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Full name <span className="text-red-500 dark:text-red-400">*</span></Label>
                  <Input {...editForm.register('fullName', { required: 'Full name is required' })} placeholder="Technician's full name" className="h-9" />
                  {editErrors.fullName && (
                    <p className="text-xs text-red-500 dark:text-red-400">{editErrors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Phone <span className="text-red-500 dark:text-red-400">*</span></Label>
                  <Input
                    {...editForm.register('phone', { required: 'Phone is required' })}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+233 XX XXX XXXX"
                    className="h-9"
                  />
                  {editErrors.phone && (
                    <p className="text-xs text-red-500 dark:text-red-400">{editErrors.phone.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  {...editForm.register('email', {
                    validate: (v) =>
                      !v?.trim() ||
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ||
                      'Enter a valid email address',
                  })}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Optional"
                  className="h-9"
                />
                {editErrors.email && (
                  <p className="text-xs text-red-500 dark:text-red-400">{editErrors.email.message}</p>
                )}
              </div>

              <hr className="border-slate-100 dark:border-slate-700" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Service info</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Display name <span className="text-red-500 dark:text-red-400">*</span></Label>
                  <Input {...editForm.register('displayName', { required: 'Display name is required' })} placeholder="Business / trade name" className="h-9" />
                  {editErrors.displayName && (
                    <p className="text-xs text-red-500 dark:text-red-400">{editErrors.displayName.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Business phone</Label>
                  <Input
                    {...editForm.register('phoneBusiness')}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Shop contact"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-1" role="group" aria-labelledby={editSpecsLabelId}>
                <Label id={editSpecsLabelId}>
                  Specializations <span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400">Choose every trade this technician offers.</p>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS.map((s) => {
                    const on = editSpecs.includes(s.value)
                    return (
                      <button
                        key={s.value}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${on ? 'Remove' : 'Add'} ${s.label}`}
                        onClick={() => toggleSpec(editSpecs, editForm.setValue, s.value)}
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
                          on
                            ? 'bg-brand-600 text-white ring-brand-600'
                            : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600 dark:hover:bg-slate-700',
                        )}
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </div>
                {editSpecs.length === 0 && (
                  <p className="text-xs text-red-500 dark:text-red-400">Select at least one specialization</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Service mode</Label>
                  <select className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" {...editForm.register('serviceMode')}>
                    {SERVICE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Location</Label>
                  <Input {...editForm.register('locationText')} placeholder="e.g. Kaneshie, Accra" className="h-9" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <textarea {...editForm.register('description')} rows={2} placeholder="Brief expertise description..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-brand-500/10" />
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Admin</p>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm capitalize dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" {...editForm.register('onboardingStatus')}>
                  {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={editM.isPending || editSpecs.length === 0} className="gap-1.5">
              <Pencil className="h-4 w-4" />
              {editM.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} className="max-w-sm">
        <ModalHeader>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Delete technician</h2>
        </ModalHeader>
        <ModalBody>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
              <Trash2 className="h-5 w-5 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Are you sure you want to delete <span className="font-semibold">{deleteTech?.displayName}</span>? This will remove the technician profile and reset the user's role.
              </p>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">This action cannot be undone.</p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
          <Button type="button" disabled={deleteM.isPending} onClick={() => deleteM.mutate(deleteTech?.id)} className="gap-1.5 bg-red-600 text-white hover:bg-red-700">
            <Trash2 className="h-4 w-4" />
            {deleteM.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
