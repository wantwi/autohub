import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Image, MessageCircle, Mic, Search, ShoppingBag, Video, FileText } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useChatContext } from '@/providers/ChatProvider'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'

const ATTACHMENT_LABELS = {
  image: { label: 'Photo', icon: Image },
  video: { label: 'Video', icon: Video },
  audio: { label: 'Voice note', icon: Mic },
  document: { label: 'Document', icon: FileText },
  part_card: { label: 'Part enquiry', icon: ShoppingBag },
}

function timeLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ChatInboxPage({ activeId, onSelect, sidebar = false }) {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const { subscribe, setUnread } = useChatContext()
  const [search, setSearch] = useState('')

  const conversationsQ = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiJson('/conversations'),
    refetchInterval: 30000,
  })

  const unreadQ = useQuery({
    queryKey: ['conversations-unread'],
    queryFn: () => apiJson('/conversations/unread-count'),
  })

  useEffect(() => {
    if (unreadQ.data?.count != null) {
      setUnread(unreadQ.data.count)
    }
  }, [unreadQ.data, setUnread])

  useEffect(() => {
    return subscribe((event) => {
      if (event === 'new_message') {
        conversationsQ.refetch()
        unreadQ.refetch()
      }
    })
  }, [subscribe, conversationsQ, unreadQ])

  const conversations = Array.isArray(conversationsQ.data) ? conversationsQ.data : []

  const getOtherName = (c) => {
    const isDealerSide = c.dealerUserId === user?.id
    const isTechSide = c.technicianUserId === user?.id
    if (isDealerSide || isTechSide) return c.buyerName || 'Buyer'
    return c.dealerShopName || c.technicianDisplayName || 'Contact'
  }

  const filtered = search.trim()
    ? conversations.filter((c) => {
        const term = search.toLowerCase()
        return (
          (c.dealerShopName || '').toLowerCase().includes(term) ||
          (c.technicianDisplayName || '').toLowerCase().includes(term) ||
          (c.buyerName || '').toLowerCase().includes(term) ||
          (c.partName || '').toLowerCase().includes(term) ||
          (c.lastMessage || '').toLowerCase().includes(term)
        )
      })
    : conversations

  const handleClick = (c) => {
    if (onSelect) {
      onSelect(c.id)
    } else {
      navigate(`/messages/${c.id}`)
    }
  }

  if (conversationsQ.isLoading) return <LoadingSpinner />

  if (sidebar) {
    return (
      <div className="flex h-full flex-col bg-white dark:bg-slate-900">
        {/* Sidebar header */}
        <div className="border-b border-slate-200 bg-[#f0f2f5] px-3 py-3 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Chats</h2>
        </div>

        {/* Search */}
        <div className="bg-white px-2 py-2 dark:bg-slate-900">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg bg-[#f0f2f5] py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <MessageCircle className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {conversations.length === 0 ? 'No conversations yet' : 'No results'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((c) => {
                const otherName = getOtherName(c)
                const initial = (otherName[0] || 'C').toUpperCase()
                const isLastSender = c.lastMessageSenderId === user?.id
                const isActive = c.id === activeId

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleClick(c)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[#f0f2f5] dark:hover:bg-slate-800',
                      isActive && 'bg-[#f0f2f5] dark:bg-slate-800',
                    )}
                  >
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                      {initial}
                      {c.unreadCount > 0 && (
                        <span className="absolute -right-0.5 bottom-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('truncate text-[14px]', c.unreadCount > 0 ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-800 dark:text-slate-200')}>
                          {otherName}
                        </p>
                        <span className={cn('shrink-0 text-[11px]', c.unreadCount > 0 ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500')}>
                          {timeLabel(c.lastMessageAt)}
                        </span>
                      </div>
                      <p className={cn('mt-0.5 flex items-center gap-1 truncate text-[13px]', c.unreadCount > 0 ? 'font-medium text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400')}>
                        {isLastSender ? 'You: ' : ''}
                        {(() => {
                          const att = ATTACHMENT_LABELS[c.lastMessageAttachmentType]
                          if (att && !c.lastMessage) {
                            const Icon = att.icon
                            return <><Icon className="inline h-3.5 w-3.5 shrink-0" /> {att.label}</>
                          }
                          return c.lastMessage || 'No messages yet'
                        })()}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Standalone full-page mode
  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Messages</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your conversations with dealers, technicians, and buyers.</p>
      </div>

      {conversations.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={conversations.length === 0 ? 'No conversations yet' : 'No results found'}
          description={
            conversations.length === 0
              ? "When you message a dealer, your conversations will appear here."
              : 'Try a different search term.'
          }
          actionLabel={conversations.length === 0 ? 'Browse dealers' : undefined}
          actionTo={conversations.length === 0 ? '/dealers' : undefined}
        />
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
          {filtered.map((c) => {
            const otherName = getOtherName(c)
            const initial = (otherName[0] || 'C').toUpperCase()
            const isLastSender = c.lastMessageSenderId === user?.id

            return (
              <Link
                key={c.id}
                to={`/messages/${c.id}`}
                className={cn(
                  'flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800',
                  c.unreadCount > 0 && 'bg-emerald-50/40 dark:bg-emerald-900/20',
                )}
              >
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  {initial}
                  {c.unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                      {c.unreadCount}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('truncate text-sm', c.unreadCount > 0 ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-800 dark:text-slate-200')}>
                      {otherName}
                    </p>
                    <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                      {timeLabel(c.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={cn('flex items-center gap-1 truncate text-xs', c.unreadCount > 0 ? 'font-medium text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400')}>
                      {isLastSender ? 'You: ' : ''}
                      {(() => {
                        const att = ATTACHMENT_LABELS[c.lastMessageAttachmentType]
                        if (att && !c.lastMessage) {
                          const Icon = att.icon
                          return <><Icon className="inline h-3 w-3 shrink-0" /> {att.label}</>
                        }
                        return c.lastMessage || 'No messages yet'
                      })()}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
