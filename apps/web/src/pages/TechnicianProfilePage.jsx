import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  Building2,
  Calendar,
  Clock,
  Edit3,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  Reply,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Truck,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiJson } from '@/lib/api'
import { SPECIALIZATIONS, SERVICE_MODES } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import { BookServiceModal } from '@/components/BookServiceModal'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

function memberSinceLabel(value) {
  if (!value) return 'New technician'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return 'New technician'
  return `Member since ${dt.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
}

function initials(name) {
  const txt = String(name || 'Technician').trim()
  const parts = txt.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || 'T'
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function specLabel(value) {
  return SPECIALIZATIONS.find((s) => s.value === value)?.label ?? value
}

function modeLabel(value) {
  return SERVICE_MODES.find((m) => m.value === value)?.label ?? value
}

function StarRow({ rating, size = 'sm' }) {
  const n = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)))
  const dim = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(dim, i < n ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-600')}
          aria-hidden
        />
      ))}
    </span>
  )
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="rounded p-0.5 transition-transform hover:scale-110 focus:outline-none"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              'h-8 w-8 transition-colors',
              n <= (hover || value)
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-200 hover:text-amber-200 dark:text-slate-600 dark:hover:text-amber-300',
            )}
          />
        </button>
      ))}
    </div>
  )
}

function ratingDistribution(reviews) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of reviews) {
    const k = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)))
    dist[k] += 1
  }
  return dist
}

function TechnicianReviewCard({ review, technicianUserId, technicianId, onMutate }) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [editReplyId, setEditReplyId] = useState(null)
  const [editReplyText, setEditReplyText] = useState('')

  const isMyReview = user?.id === review.buyerId
  const isTechnicianOwner = user?.id === technicianUserId
  const hasReply = review.replies?.length > 0

  const reactMut = useMutation({
    mutationFn: (reaction) =>
      apiJson(`/reviews/technician/${review.id}/react`, {
        method: 'POST',
        body: JSON.stringify({ reaction }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['technician-reviews', technicianId] }),
    onError: (e) => toast.error(e.message),
  })

  const replyMut = useMutation({
    mutationFn: (comment) =>
      apiJson(`/reviews/technician/${review.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }),
    onSuccess: () => {
      toast.success('Reply posted')
      setReplyOpen(false)
      setReplyText('')
      qc.invalidateQueries({ queryKey: ['technician-reviews', technicianId] })
    },
    onError: (e) => toast.error(e.message),
  })

  const editReplyMut = useMutation({
    mutationFn: ({ id, comment }) =>
      apiJson(`/technician-review-replies/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ comment }),
      }),
    onSuccess: () => {
      toast.success('Reply updated')
      setEditReplyId(null)
      qc.invalidateQueries({ queryKey: ['technician-reviews', technicianId] })
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteReplyMut = useMutation({
    mutationFn: (rid) => apiJson(`/technician-review-replies/${rid}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Reply deleted')
      qc.invalidateQueries({ queryKey: ['technician-reviews', technicianId] })
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <Card className="animate-fade-in-up border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-700/80 dark:shadow-slate-900/50 dark:hover:shadow-slate-900/50">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {(review.buyerName || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {review.buyerName || 'User'}
                {isMyReview && (
                  <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-800 dark:bg-brand-500/20 dark:text-brand-400">
                    You
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(review.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StarRow rating={review.rating} />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {Number(review.rating).toFixed(1)}
            </span>
          </div>
        </div>

        {review.comment && (
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{review.comment}</p>
        )}

        {isMyReview && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              onClick={() => onMutate?.('edit', review)}
            >
              <Edit3 className="h-3 w-3" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-400"
              onClick={() => onMutate?.('delete', review)}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          </div>
        )}

        <div className="flex items-center gap-4 border-t border-slate-100 pt-3 dark:border-slate-700">
          <button
            type="button"
            disabled={!user || reactMut.isPending}
            onClick={() => reactMut.mutate('like')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
              review.myReaction === 'like'
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400'
                : 'bg-slate-50 text-slate-500 hover:bg-brand-50 hover:text-brand-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-brand-500/15 dark:hover:text-brand-400',
              !user && 'cursor-not-allowed opacity-50',
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {review.likeCount || 0}
          </button>
          <button
            type="button"
            disabled={!user || reactMut.isPending}
            onClick={() => reactMut.mutate('dislike')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
              review.myReaction === 'dislike'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-red-900/30 dark:hover:text-red-400',
              !user && 'cursor-not-allowed opacity-50',
            )}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            {review.dislikeCount || 0}
          </button>

          {isTechnicianOwner && !hasReply && (
            <button
              type="button"
              onClick={() => setReplyOpen(true)}
              className="ml-auto flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>
          )}
        </div>

        {replyOpen && (
          <div className="animate-fade-in-up rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <Label className="mb-2 text-xs text-slate-600 dark:text-slate-400">Your reply</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-900/50 dark:focus-visible:ring-slate-100/10 dark:placeholder:text-slate-500"
              placeholder="Reply to this review..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={!replyText.trim() || replyMut.isPending}
                onClick={() => replyMut.mutate(replyText.trim())}
              >
                {replyMut.isPending ? 'Posting...' : 'Post reply'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplyOpen(false)
                  setReplyText('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {review.replies?.map((rep) => (
          <div
            key={rep.id}
            className="animate-fade-in-up ml-4 rounded-lg border-l-4 border-brand-300 bg-brand-50/60 p-4 dark:bg-brand-500/15"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800 dark:bg-brand-500/20 dark:text-brand-400">
                Technician response
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(rep.createdAt)}</span>
            </div>
            <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              {rep.authorName || 'Technician'}
            </p>

            {editReplyId === rep.id ? (
              <div className="space-y-2">
                <textarea
                  className="flex min-h-[60px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-900/50 dark:focus-visible:ring-slate-100/10"
                  value={editReplyText}
                  onChange={(e) => setEditReplyText(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!editReplyText.trim() || editReplyMut.isPending}
                    onClick={() => editReplyMut.mutate({ id: rep.id, comment: editReplyText.trim() })}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditReplyId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{rep.comment}</p>
                {isTechnicianOwner && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[11px] text-slate-500 dark:text-slate-400"
                      onClick={() => {
                        setEditReplyId(rep.id)
                        setEditReplyText(rep.comment)
                      }}
                    >
                      <Edit3 className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[11px] text-red-500 dark:text-red-400"
                      onClick={() => deleteReplyMut.mutate(rep.id)}
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function TechnicianProfilePage() {
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState('reviews')
  const [bookOpen, setBookOpen] = useState(false)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [formRating, setFormRating] = useState(0)
  const [formComment, setFormComment] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [messagePending, setMessagePending] = useState(false)

  const profileQ = useQuery({
    queryKey: ['technician', id],
    queryFn: () => apiJson(`/technicians/${id}`),
    enabled: !!id,
  })

  const reviewsQ = useQuery({
    queryKey: ['technician-reviews', id],
    queryFn: () => apiJson(`/technicians/${id}/reviews`),
    enabled: !!id,
  })

  const payload = profileQ.data
  const technician = payload?.technician ?? payload
  const reviews = Array.isArray(reviewsQ.data) ? reviewsQ.data : []

  const createReviewMut = useMutation({
    mutationFn: (body) =>
      apiJson(`/technicians/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Review posted!')
      closeReviewModal()
      resetInlineReview()
      qc.invalidateQueries({ queryKey: ['technician-reviews', id] })
      qc.invalidateQueries({ queryKey: ['technician', id] })
    },
    onError: (e) => toast.error(e.message),
  })

  const updateReviewMut = useMutation({
    mutationFn: ({ reviewId, body }) =>
      apiJson(`/reviews/technician/${reviewId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Review updated')
      closeReviewModal()
      qc.invalidateQueries({ queryKey: ['technician-reviews', id] })
      qc.invalidateQueries({ queryKey: ['technician', id] })
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteReviewMut = useMutation({
    mutationFn: (reviewId) => apiJson(`/reviews/technician/${reviewId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Review deleted')
      setDeleteConfirm(null)
      qc.invalidateQueries({ queryKey: ['technician-reviews', id] })
      qc.invalidateQueries({ queryKey: ['technician', id] })
    },
    onError: (e) => toast.error(e.message),
  })

  function closeReviewModal() {
    setReviewModalOpen(false)
    setEditingReview(null)
    setFormRating(0)
    setFormComment('')
  }

  const [inlineRating, setInlineRating] = useState(0)
  const [inlineComment, setInlineComment] = useState('')

  function resetInlineReview() {
    setInlineRating(0)
    setInlineComment('')
  }

  function handleReviewAction(action, review) {
    if (action === 'edit') {
      setEditingReview(review)
      setFormRating(review.rating)
      setFormComment(review.comment || '')
      setReviewModalOpen(true)
    }
    if (action === 'delete') {
      setDeleteConfirm(review)
    }
  }

  function submitReviewModal() {
    if (formRating < 1) {
      toast.error('Please select a rating')
      return
    }
    const body = { rating: formRating, comment: formComment.trim() || null }
    if (editingReview) {
      updateReviewMut.mutate({ reviewId: editingReview.id, body })
    }
  }

  function submitInlineReview() {
    if (inlineRating < 1) {
      toast.error('Please select a rating')
      return
    }
    createReviewMut.mutate({ rating: inlineRating, comment: inlineComment.trim() || null })
  }

  const handleMessage = async () => {
    if (!user) return navigate('/login')
    setMessagePending(true)
    try {
      const conv = await apiJson('/conversations', {
        method: 'POST',
        body: JSON.stringify({ technicianId: id }),
      })
      navigate(`/messages/${conv.id}`)
    } catch (e) {
      toast.error(e.message ?? 'Could not start conversation')
    } finally {
      setMessagePending(false)
    }
  }

  if (profileQ.isLoading) return <LoadingSpinner />
  if (profileQ.isError || !technician) {
    return (
      <EmptyState title="Technician not found" actionLabel="All services" actionTo="/services" className="dark:border-slate-700 dark:bg-slate-900/50" />
    )
  }

  const displayName = technician.displayName ?? technician.display_name ?? 'Technician'
  const description = technician.description ?? ''
  const locationText = technician.locationText ?? technician.location_text ?? 'Location not set'
  const phoneBusiness = technician.phoneBusiness ?? technician.phone_business
  const isVerified = technician.isVerified ?? technician.is_verified ?? false
  const ratingAvg = Number(technician.ratingAvg ?? technician.rating_avg ?? 0)
  const ratingCount = technician.ratingCount ?? technician.rating_count ?? 0
  const bannerUrl = technician.bannerUrl ?? technician.banner_url
  const createdAt = technician.createdAt ?? technician.created_at
  const serviceMode = technician.serviceMode ?? technician.service_mode ?? 'both'
  const specs = Array.isArray(technician.specializations) ? technician.specializations : []
  const operatingHours = technician.operatingHours ?? technician.operating_hours
  const openOnHolidays = Boolean(technician.openOnHolidays ?? technician.open_on_holidays)
  const technicianUserId = technician.userId ?? technician.user_id

  const dist = ratingDistribution(reviews)
  const distTotal = reviews.length || 1
  const summaryAvg =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / reviews.length
      : ratingAvg
  const summaryCount = reviews.length || ratingCount

  const alreadyReviewed = user ? reviews.some((r) => r.buyerId === user.id) : false
  const isSelf = user?.id === technicianUserId

  const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }

  return (
    <div className="animate-fade-in-up space-y-10 pb-10">
      {bookOpen ? (
        <BookServiceModal
          technicianId={id}
          technicianName={displayName}
          onClose={() => setBookOpen(false)}
        />
      ) : null}

      <section
        className="relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-xl"
        style={
          bannerUrl
            ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/80 to-slate-900/65" />
        <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold shadow-lg ring-2 ring-white/25 backdrop-blur-sm">
              {initials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{displayName}</h1>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                    Verified
                  </span>
                ) : null}
              </div>

              {specs.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {specs.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-100 backdrop-blur-sm"
                    >
                      <Wrench className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                      {specLabel(s)}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2 text-xs sm:text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1.5 text-amber-100">
                  <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                  {ratingAvg.toFixed(1)} ({ratingCount} reviews)
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-slate-100 backdrop-blur-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {locationText}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-slate-100 backdrop-blur-sm">
                  {serviceMode === 'mobile' ? (
                    <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  ) : serviceMode === 'workshop' ? (
                    <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  ) : (
                    <>
                      <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <Building2 className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                    </>
                  )}
                  {modeLabel(serviceMode)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-slate-100 backdrop-blur-sm">
                  <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {memberSinceLabel(createdAt)}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  size="sm"
                  className="gap-2 bg-brand-500 text-white shadow-lg hover:bg-brand-400"
                  onClick={() => {
                    if (!user) return navigate('/login')
                    setBookOpen(true)
                  }}
                >
                  <Calendar className="h-4 w-4" aria-hidden />
                  Book Service
                </Button>
                {!isSelf && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                    disabled={messagePending}
                    onClick={handleMessage}
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    {messagePending ? 'Opening\u2026' : 'Message'}
                  </Button>
                )}
                {!user && (
                  <Button asChild variant="outline" size="sm" className="gap-2 border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20">
                    <Link to="/login">
                      <Lock className="h-4 w-4" aria-hidden />
                      Sign in to book
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="animate-fade-in-up">
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-1 dark:border-slate-700/80">
          <Button
            type="button"
            variant={tab === 'reviews' ? 'brand' : 'ghost'}
            size="sm"
            className={cn('gap-2 rounded-lg', tab !== 'reviews' && 'text-slate-600 dark:text-slate-400')}
            onClick={() => setTab('reviews')}
          >
            <Star className="h-4 w-4" aria-hidden />
            Reviews
            {reviews.length > 0 ? (
              <span
                className={cn(
                  'ml-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                  tab === 'reviews'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
                )}
              >
                {reviews.length}
              </span>
            ) : null}
          </Button>
          <Button
            type="button"
            variant={tab === 'about' ? 'brand' : 'ghost'}
            size="sm"
            className={cn('gap-2 rounded-lg', tab !== 'about' && 'text-slate-600 dark:text-slate-400')}
            onClick={() => setTab('about')}
          >
            <Clock className="h-4 w-4" aria-hidden />
            About
          </Button>
        </div>

        {tab === 'reviews' ? (
          <div className="animate-fade-in-up space-y-6">
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-slate-900/50">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
                <div className="flex shrink-0 items-center gap-4 border-b border-slate-100 pb-6 dark:border-slate-700 lg:flex-col lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
                  <div className="text-center">
                    <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {summaryAvg.toFixed(1)}
                    </p>
                    <StarRow rating={summaryAvg} size="lg" />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {summaryCount} review{summaryCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const c = dist[star] || 0
                    const pct = Math.round((c / distTotal) * 100)
                    return (
                      <div key={star} className="flex items-center gap-3 text-xs sm:text-sm">
                        <span className="w-8 font-medium text-slate-600 dark:text-slate-400">{star}★</span>
                        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all dark:bg-amber-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right tabular-nums text-slate-500 dark:text-slate-400">{c}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {user && !alreadyReviewed && !isSelf && (
              <Card className="border-slate-200/80 dark:border-slate-700/80">
                <CardContent className="space-y-4 p-5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Write a review</h3>
                  <div className="space-y-2">
                    <Label>Your rating</Label>
                    <StarPicker value={inlineRating} onChange={setInlineRating} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inline-review-comment">Comment (optional)</Label>
                    <textarea
                      id="inline-review-comment"
                      rows={3}
                      value={inlineComment}
                      onChange={(e) => setInlineComment(e.target.value)}
                      maxLength={5000}
                      className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500 dark:focus-visible:ring-slate-100/10"
                      placeholder="Share your experience\u2026"
                    />
                  </div>
                  <Button disabled={inlineRating < 1 || createReviewMut.isPending} onClick={submitInlineReview}>
                    {createReviewMut.isPending ? 'Submitting\u2026' : 'Submit review'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!user && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Sign in to leave a review or react to feedback.</p>
            )}
            {alreadyReviewed && (
              <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800 dark:bg-brand-500/20 dark:text-brand-400">
                You've reviewed this technician
              </span>
            )}

            {reviewsQ.isLoading ? <LoadingSpinner /> : null}
            {reviews.length === 0 && !reviewsQ.isLoading ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                No reviews yet. Be the first to review this technician.
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <TechnicianReviewCard
                    key={r.id}
                    review={r}
                    technicianUserId={technicianUserId}
                    technicianId={id}
                    onMutate={handleReviewAction}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="animate-fade-in-up space-y-6">
            {description && (
              <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-sm dark:border-slate-700/80 dark:from-slate-900 dark:to-slate-800/50">
                <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{description}</p>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900 dark:hover:shadow-slate-800/50">
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-brand-100/50 blur-2xl dark:bg-brand-500/10" />
                <div className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 shadow-sm dark:bg-brand-500/15 dark:text-brand-400">
                      {serviceMode === 'mobile' ? <Truck className="h-5 w-5" /> : serviceMode === 'workshop' ? <Building2 className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Service mode</h3>
                      <p className="text-xs font-medium text-brand-600 dark:text-brand-400">{modeLabel(serviceMode)}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {serviceMode === 'mobile' && 'This technician can travel to your location for on-site repairs and servicing.'}
                    {serviceMode === 'workshop' && 'Services are performed at the technician\u2019s dedicated workshop facility.'}
                    {serviceMode === 'both' && 'Flexible service \u2014 both mobile visits and workshop appointments are available.'}
                  </p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900 dark:hover:shadow-slate-800/50">
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-amber-100/50 blur-2xl dark:bg-amber-500/10" />
                <div className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shadow-sm dark:bg-amber-500/15 dark:text-amber-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Location</h3>
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{locationText}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {memberSinceLabel(createdAt)}
                  </p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900 dark:hover:shadow-slate-800/50">
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-emerald-100/50 blur-2xl dark:bg-emerald-500/10" />
                <div className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-400">
                      <Phone className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Contact</h3>
                  </div>
                  {user && phoneBusiness ? (
                    <a
                      href={`tel:${String(phoneBusiness).replace(/[^\d+]/g, '')}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                    >
                      <Phone className="h-4 w-4" />
                      {phoneBusiness}
                    </a>
                  ) : user ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Phone number not provided.</p>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                      <Lock className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Sign in to view contact details</p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="shrink-0">
                        <Link to="/login">Sign in</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {specs.length > 0 && (
                <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900 dark:hover:shadow-slate-800/50">
                  <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-violet-100/50 blur-2xl dark:bg-violet-500/10" />
                  <div className="relative">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 shadow-sm dark:bg-violet-500/15 dark:text-violet-400">
                        <Wrench className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Specializations</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {specs.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200/60 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20"
                        >
                          {specLabel(s)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
              <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-700/80">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 shadow-sm dark:bg-sky-500/15 dark:text-sky-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Operating hours</h3>
                  {openOnHolidays && (
                    <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-800 dark:bg-brand-500/20 dark:text-brand-400">
                      Open on holidays
                    </span>
                  )}
                </div>
              </div>
              {operatingHours && typeof operatingHours === 'object' && Object.keys(operatingHours).length > 0 ? (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((dayKey) => {
                    const hours = operatingHours[dayKey]
                    const isWeekend = dayKey === 'sat' || dayKey === 'sun'
                    return (
                      <li key={dayKey} className={cn('flex items-center justify-between px-6 py-3', isWeekend && 'bg-slate-50/60 dark:bg-slate-800/40')}>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{DAY_NAMES[dayKey]}</span>
                        {hours ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">{hours}</span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500">Closed</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="px-6 py-8 text-center">
                  <Clock className="mx-auto h-8 w-8 text-slate-200 dark:text-slate-700" />
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Operating hours not listed yet.</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Contact the technician directly to confirm availability.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal open={reviewModalOpen} onClose={closeReviewModal} className="max-w-md dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/50">
        <ModalHeader className="dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Edit your review</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update your rating and feedback.</p>
        </ModalHeader>
        <ModalBody className="space-y-5">
          <div className="space-y-2">
            <Label>Your rating</Label>
            <StarPicker value={formRating} onChange={setFormRating} />
          </div>
          <div className="space-y-2">
            <Label>Your review (optional)</Label>
            <textarea
              className="flex min-h-[100px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500 dark:focus-visible:ring-slate-100/10"
              placeholder="Tell others about your experience..."
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              maxLength={5000}
            />
          </div>
        </ModalBody>
        <ModalFooter className="dark:border-slate-700 dark:bg-slate-800/80">
          <Button variant="ghost" onClick={closeReviewModal}>
            Cancel
          </Button>
          <Button disabled={formRating < 1 || updateReviewMut.isPending} onClick={submitReviewModal}>
            {updateReviewMut.isPending ? 'Saving\u2026' : 'Update review'}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} className="max-w-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/50">
        <ModalHeader className="dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete review?</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
        </ModalHeader>
        <ModalFooter className="dark:border-slate-700 dark:bg-slate-800/80">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleteReviewMut.isPending}
            onClick={() => deleteReviewMut.mutate(deleteConfirm.id)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {deleteReviewMut.isPending ? 'Deleting\u2026' : 'Delete'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
