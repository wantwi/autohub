import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Edit3,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  Package,
  Phone,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiJson } from '@/lib/api'
import { normalizeList } from '@/lib/normalize'
import { getEnv } from '@/lib/env'
import { useAuthStore } from '@/stores/authStore'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { PartCard } from '@/components/PartCard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function memberSinceLabel(value) {
  if (!value) return 'New dealer'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return 'New dealer'
  return `Member since ${dt.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
}

function initials(name) {
  const txt = String(name || 'Dealer').trim()
  const parts = txt.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || 'D'
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

/* ── Star components ─────────────────────────────────────────────────────── */

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

/* ── Review Card ─────────────────────────────────────────────────────────── */

function ReviewCard({ review, dealerUserId, dealerId, onMutate }) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [editReplyId, setEditReplyId] = useState(null)
  const [editReplyText, setEditReplyText] = useState('')

  const isMyReview = user?.id === review.buyerId
  const isShopOwner = user?.id === dealerUserId
  const hasReply = review.replies?.length > 0

  const reactMut = useMutation({
    mutationFn: (reaction) =>
      apiJson(`/reviews/${review.id}/react`, {
        method: 'POST',
        body: JSON.stringify({ reaction }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dealer-reviews', dealerId] }),
    onError: (e) => toast.error(e.message),
  })

  const replyMut = useMutation({
    mutationFn: (comment) =>
      apiJson(`/reviews/${review.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }),
    onSuccess: () => {
      toast.success('Reply posted')
      setReplyOpen(false)
      setReplyText('')
      qc.invalidateQueries({ queryKey: ['dealer-reviews', dealerId] })
    },
    onError: (e) => toast.error(e.message),
  })

  const editReplyMut = useMutation({
    mutationFn: ({ id, comment }) =>
      apiJson(`/review-replies/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ comment }),
      }),
    onSuccess: () => {
      toast.success('Reply updated')
      setEditReplyId(null)
      qc.invalidateQueries({ queryKey: ['dealer-reviews', dealerId] })
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteReplyMut = useMutation({
    mutationFn: (id) => apiJson(`/review-replies/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Reply deleted')
      qc.invalidateQueries({ queryKey: ['dealer-reviews', dealerId] })
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <Card className="animate-fade-in-up border-slate-200/80 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-700/80 dark:shadow-slate-900/50 dark:hover:shadow-slate-900/50">
      <CardContent className="space-y-4 p-5">
        {/* Header */}
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
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{Number(review.rating).toFixed(1)}</span>
          </div>
        </div>

        {/* Comment */}
        {review.comment && (
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{review.comment}</p>
        )}

        {/* Actions: edit/delete for owner */}
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

        {/* Reactions */}
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

          {isShopOwner && !hasReply && (
            <button
              type="button"
              onClick={() => setReplyOpen(true)}
              className="ml-auto flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Reply
            </button>
          )}
        </div>

        {/* Reply form */}
        {replyOpen && (
          <div className="animate-fade-in-up rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <Label className="mb-2 text-xs text-slate-600 dark:text-slate-400">Your reply as shop owner</Label>
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
              <Button size="sm" variant="ghost" onClick={() => { setReplyOpen(false); setReplyText('') }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Existing replies */}
        {review.replies?.map((rep) => (
          <div
            key={rep.id}
            className="animate-fade-in-up ml-4 rounded-lg border-l-4 border-brand-300 bg-brand-50/60 p-4 dark:bg-brand-500/15"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800 dark:bg-brand-500/20 dark:text-brand-400">
                Dealer response
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(rep.createdAt)}</span>
            </div>

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
                  <Button size="sm" variant="ghost" onClick={() => setEditReplyId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{rep.comment}</p>
                {isShopOwner && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[11px] text-slate-500 dark:text-slate-400"
                      onClick={() => { setEditReplyId(rep.id); setEditReplyText(rep.comment) }}
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

/* ── Main Page ───────────────────────────────────────────────────────────── */

export function DealerProfilePage() {
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const mapsKey = getEnv().googleMapsApiKey
  const [tab, setTab] = useState('parts')

  // Review form state
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [formRating, setFormRating] = useState(0)
  const [formComment, setFormComment] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const dealerQ = useQuery({
    queryKey: ['dealer', id],
    queryFn: () => apiJson(`/dealers/${id}`),
    enabled: !!id,
  })

  const reviewsQ = useQuery({
    queryKey: ['dealer-reviews', id],
    queryFn: () => apiJson(`/dealers/${id}/reviews`),
    enabled: !!id,
  })

  const payload = dealerQ.data
  const dealer = payload?.dealer ?? payload
  const parts = normalizeList(payload?.parts || payload?.recentParts || payload?.recent_parts || []).items
  const reviews = Array.isArray(reviewsQ.data) ? reviewsQ.data : []

  const createReviewMut = useMutation({
    mutationFn: (body) =>
      apiJson(`/dealers/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Review posted!')
      closeReviewModal()
      qc.invalidateQueries({ queryKey: ['dealer-reviews', id] })
      qc.invalidateQueries({ queryKey: ['dealer', id] })
    },
    onError: (e) => toast.error(e.message),
  })

  const updateReviewMut = useMutation({
    mutationFn: ({ reviewId, body }) =>
      apiJson(`/reviews/${reviewId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Review updated')
      closeReviewModal()
      qc.invalidateQueries({ queryKey: ['dealer-reviews', id] })
      qc.invalidateQueries({ queryKey: ['dealer', id] })
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteReviewMut = useMutation({
    mutationFn: (reviewId) => apiJson(`/reviews/${reviewId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Review deleted')
      setDeleteConfirm(null)
      qc.invalidateQueries({ queryKey: ['dealer-reviews', id] })
      qc.invalidateQueries({ queryKey: ['dealer', id] })
    },
    onError: (e) => toast.error(e.message),
  })

  const messageDealerMut = useMutation({
    mutationFn: (body) =>
      apiJson('/conversations', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (conv) => navigate(`/messages/${conv.id}`),
    onError: (e) => toast.error(e.message),
  })

  function closeReviewModal() {
    setReviewModalOpen(false)
    setEditingReview(null)
    setFormRating(0)
    setFormComment('')
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

  function submitReview() {
    if (formRating < 1) {
      toast.error('Please select a rating')
      return
    }
    const body = { rating: formRating, comment: formComment.trim() || null }
    if (editingReview) {
      updateReviewMut.mutate({ reviewId: editingReview.id, body })
    } else {
      createReviewMut.mutate(body)
    }
  }

  if (dealerQ.isLoading) return <LoadingSpinner />
  if (dealerQ.isError || !dealer) {
    return <EmptyState title="Dealer not found" actionLabel="All dealers" actionTo="/dealers" />
  }

  const shopName = dealer.shopName ?? dealer.shop_name ?? 'Dealer'
  const description = dealer.description ?? ''
  const locationText = dealer.locationText ?? dealer.location_text ?? 'Location not set'
  const phoneBusiness = dealer.phoneBusiness ?? dealer.phone_business
  const isVerified = dealer.isVerified ?? dealer.is_verified ?? false
  const ratingAvg = Number(dealer.ratingAvg ?? dealer.rating_avg ?? 0)
  const ratingCount = dealer.ratingCount ?? dealer.rating_count ?? 0
  const bannerUrl = dealer.bannerUrl ?? dealer.banner_url
  const createdAt = dealer.createdAt ?? dealer.created_at
  const lat = dealer.lat
  const lng = dealer.lng
  const openOnHolidays = Boolean(dealer.openOnHolidays ?? dealer.open_on_holidays)
  const dealerUserId = dealer.userId ?? dealer.user_id

  const phoneDigits = (phoneBusiness || '').replace(/[^0-9+]/g, '')

  const mapSrc =
    lat != null && lng != null && mapsKey
      ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(mapsKey)}&q=${encodeURIComponent(`${lat},${lng}`)}`
      : null

  const alreadyReviewed = user ? reviews.some((r) => r.buyerId === user.id) : false
  const isSelf = user?.id === dealerUserId

  return (
    <div className="animate-fade-in-up space-y-10 pb-10">
      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-xl"
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/80 to-slate-900/65" />
        <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold shadow-lg ring-2 ring-white/25 backdrop-blur-sm">
              {initials(shopName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{shopName}</h1>
                {isVerified ? <VerifiedBadge className="text-brand-300" /> : null}
              </div>
              {description ? <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-200">{description}</p> : null}
              <div className="mt-6 flex flex-wrap gap-2 text-xs sm:text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-slate-100 backdrop-blur-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {locationText}
                </span>
                {user && phoneBusiness ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-slate-100 backdrop-blur-sm">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {phoneBusiness}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1.5 text-amber-100">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {ratingAvg.toFixed(1)} ({ratingCount} reviews)
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-slate-100 backdrop-blur-sm">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  {memberSinceLabel(createdAt)}
                </span>
                {openOnHolidays ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/25 px-3 py-1.5 text-brand-100">
                    Open on public holidays
                  </span>
                ) : null}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {user ? (
                  <>
                    {!isSelf && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                        disabled={messageDealerMut.isPending}
                        onClick={() => messageDealerMut.mutate({ dealerId: id })}
                      >
                        <MessageSquare className="h-4 w-4" />
                        {messageDealerMut.isPending ? 'Opening...' : 'Message'}
                      </Button>
                    )}
                    {phoneDigits && (
                      <Button asChild variant="outline" size="sm" className="gap-2 border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20">
                        <a href={`tel:${phoneDigits}`}>
                          <Phone className="h-4 w-4" />
                          Call
                        </a>
                      </Button>
                    )}
                  </>
                ) : (
                  <Button asChild variant="outline" size="sm" className="gap-2 border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20">
                    <Link to="/login">
                      <Lock className="h-4 w-4" />
                      Sign in to contact
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Location ───────────────────────────────────────────────────── */}
      <Card className="animate-fade-in-up border-slate-200/80 shadow-md transition-shadow hover:shadow-lg dark:border-slate-700/80 dark:shadow-slate-900/50 dark:hover:shadow-slate-900/50" style={{ animationDelay: '80ms' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold dark:text-slate-100">Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {user ? (
            mapSrc ? (
              <iframe title="Map" className="h-64 w-full rounded-xl border border-slate-200 shadow-sm dark:border-slate-700 dark:shadow-slate-900/50" loading="lazy" src={mapSrc} />
            ) : lat != null && lng != null ? (
              <Button variant="outline" size="sm" asChild>
                <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              </Button>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">Map pin not set.</p>
            )
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-10 text-center dark:border-slate-700 dark:bg-slate-800/80">
              <Lock className="mb-2 h-5 w-5 text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Sign in to view location</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Create a free account to see this dealer's exact location.</p>
              <Button asChild size="sm" className="mt-3">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Tabs ───────────────────────────────────────────────────────── */}
      <div className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-1 dark:border-slate-700/80">
          <Button
            type="button"
            variant={tab === 'parts' ? 'brand' : 'ghost'}
            size="sm"
            className={cn('gap-2 rounded-lg', tab !== 'parts' && 'text-slate-600 dark:text-slate-400')}
            onClick={() => setTab('parts')}
          >
            <Package className="h-4 w-4" aria-hidden />
            Parts
            {parts.length > 0 ? (
              <span className={cn('ml-1 rounded-full px-2 py-0.5 text-xs font-semibold', tab === 'parts' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300')}>
                {parts.length}
              </span>
            ) : null}
          </Button>
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
              <span className={cn('ml-1 rounded-full px-2 py-0.5 text-xs font-semibold', tab === 'reviews' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300')}>
                {reviews.length}
              </span>
            ) : null}
          </Button>
        </div>

        {/* Parts panel */}
        {tab === 'parts' ? (
          <div key="parts-panel" className="animate-fade-in-up">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {parts.map((p, idx) => (
                <div key={p.id} className="group" style={{ animationDelay: `${idx * 80}ms` }}>
                  <div className="h-full animate-fade-in-up transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg dark:group-hover:shadow-slate-900/50">
                    <PartCard part={{ ...p, dealer }} />
                  </div>
                </div>
              ))}
            </div>
            {parts.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                No active listings.
              </p>
            ) : null}
          </div>
        ) : (
          /* Reviews panel */
          <div key="reviews-panel" className="animate-fade-in-up space-y-6">
            {/* Rating summary + write review button */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{ratingAvg.toFixed(1)}</p>
                  <StarRow rating={ratingAvg} size="lg" />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ratingCount} review{ratingCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {user && !alreadyReviewed && !isSelf && (
                <Button
                  className="gap-2 shadow-md shadow-brand-500/20 dark:shadow-slate-900/50"
                  onClick={() => { setEditingReview(null); setFormRating(0); setFormComment(''); setReviewModalOpen(true) }}
                >
                  <Star className="h-4 w-4" />
                  Write a review
                </Button>
              )}
              {!user && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Sign in to leave a review.</p>
              )}
              {alreadyReviewed && (
                <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800 dark:bg-brand-500/20 dark:text-brand-400">
                  You've reviewed this dealer
                </span>
              )}
            </div>

            {/* Review list */}
            {reviewsQ.isLoading ? <LoadingSpinner /> : null}
            {reviews.length === 0 && !reviewsQ.isLoading ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                No reviews yet. Be the first to review this dealer!
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    dealerUserId={dealerUserId}
                    dealerId={id}
                    onMutate={handleReviewAction}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Review Modal ───────────────────────────────────────────────── */}
      <Modal open={reviewModalOpen} onClose={closeReviewModal} className="max-w-md dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/50">
        <ModalHeader className="dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {editingReview ? 'Edit your review' : 'Write a review'}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {editingReview ? 'Update your rating and feedback.' : `Share your experience with ${shopName}.`}
          </p>
        </ModalHeader>
        <ModalBody className="space-y-5">
          <div className="space-y-2">
            <Label>Your rating</Label>
            <StarPicker value={formRating} onChange={setFormRating} />
            {formRating > 0 && (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][formRating]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Your review (optional)</Label>
            <textarea
              className="flex min-h-[100px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-900/50 dark:placeholder:text-slate-500 dark:focus-visible:ring-slate-100/10 dark:focus-visible:border-slate-600"
              placeholder="Tell others about your experience..."
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              maxLength={5000}
            />
          </div>
        </ModalBody>
        <ModalFooter className="dark:border-slate-700 dark:bg-slate-800/80">
          <Button variant="ghost" onClick={closeReviewModal}>Cancel</Button>
          <Button
            disabled={formRating < 1 || createReviewMut.isPending || updateReviewMut.isPending}
            onClick={submitReview}
            className="gap-2 shadow-md dark:shadow-slate-900/50"
          >
            <Star className="h-4 w-4" />
            {createReviewMut.isPending || updateReviewMut.isPending
              ? 'Saving...'
              : editingReview ? 'Update review' : 'Submit review'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ─── Delete Confirmation Modal ──────────────────────────────────── */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} className="max-w-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/50">
        <ModalHeader className="dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete review?</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
        </ModalHeader>
        <ModalFooter className="dark:border-slate-700 dark:bg-slate-800/80">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={deleteReviewMut.isPending}
            onClick={() => deleteReviewMut.mutate(deleteConfirm.id)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {deleteReviewMut.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
