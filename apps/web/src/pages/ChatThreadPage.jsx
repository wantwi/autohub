import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Package, Send, X } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useChatContext } from '@/providers/ChatProvider'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { AttachmentPicker, DocumentPreview } from '@/components/chat/AttachmentPicker'
import { AttachmentPreviewModal } from '@/components/chat/AttachmentPreviewModal'
import { VoiceRecorder } from '@/components/chat/VoiceRecorder'
import { MessageContent, hasMediaAttachment } from '@/components/chat/MessageContent'
import { ReactionPicker } from '@/components/chat/ReactionPicker'
import { cn } from '@/lib/utils'

const LIGHT_BG = '#efeae2'
const LIGHT_PATTERN = "url(\"data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='20' cy='20' r='1' fill='%23d5d0c8' opacity='0.4'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23p)'/%3E%3C/svg%3E\")"
const DARK_BG = '#0f172a'
const DARK_PATTERN = "url(\"data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='20' cy='20' r='1' fill='%23334155' opacity='0.35'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23p)'/%3E%3C/svg%3E\")"

function useDarkMode() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return dark
}

function dateLabel(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  if (isToday) return 'Today'
  if (isYesterday) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function timeStr(dateStr) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function groupByDate(messages) {
  const groups = []
  let currentLabel = null
  for (const msg of messages) {
    const label = dateLabel(msg.createdAt)
    if (label !== currentLabel) {
      currentLabel = label
      groups.push({ label, messages: [] })
    }
    groups[groups.length - 1].messages.push(msg)
  }
  return groups
}

const ATTACHMENT_PREVIEW_LABELS = {
  image: 'Photo',
  video: 'Video',
  audio: 'Voice note',
  document: 'Document',
  part_card: 'Part enquiry',
}

function ReactionChips({ reactions, userId, onToggle }) {
  if (!reactions?.length) return null
  return (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {reactions.map((r) => {
        const didReact = r.userIds?.includes(userId)
        return (
          <button
            key={r.emoji}
            type="button"
            onClick={() => onToggle(r.emoji)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors',
              didReact
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
            )}
          >
            <span>{r.emoji}</span>
            <span className="text-[10px] font-medium">{r.count}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ChatThreadPage({ conversationId: propId, embedded = false, onBack }) {
  const { id: paramId } = useParams()
  const conversationId = propId || paramId
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const { sendMessage, markRead, startTyping, joinConversation, leaveConversation, subscribe, reactToMessage } = useChatContext()
  const isDark = useDarkMode()

  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [localMessages, setLocalMessages] = useState([])
  const [typingUser, setTypingUser] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [docAttachment, setDocAttachment] = useState(null)
  const [recording, setRecording] = useState(false)
  const [voiceStream, setVoiceStream] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [replyTo, setReplyTo] = useState(null)
  const messagesEndRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const messageRefs = useRef({})
  const typingTimeout = useRef(null)
  const typingIndicatorTimeout = useRef(null)
  const textareaRef = useRef(null)

  const convQ = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiJson('/conversations'),
    staleTime: 60000,
  })

  const conversations = Array.isArray(convQ.data) ? convQ.data : []
  const conv = conversations.find((c) => c.id === conversationId)

  const messagesQ = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => apiJson(`/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  })

  const serverMessages = Array.isArray(messagesQ.data) ? messagesQ.data : []
  const allMessages = [...serverMessages, ...localMessages]
    .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  useEffect(() => {
    if (conversationId) {
      joinConversation(conversationId)
      markRead(conversationId)
      qc.invalidateQueries({ queryKey: ['conversations-unread'] })
    }
    return () => {
      if (conversationId) leaveConversation(conversationId)
    }
  }, [conversationId, joinConversation, leaveConversation, markRead, qc])

  useEffect(() => {
    return subscribe((event, data) => {
      if (event === 'new_message' && data.conversationId === conversationId) {
        setLocalMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev
          return [...prev, data]
        })
        markRead(conversationId)
        qc.invalidateQueries({ queryKey: ['conversations-unread'] })
        setTypingUser(null)
      }
      if (event === 'typing' && data.conversationId === conversationId && data.userId !== user?.id) {
        setTypingUser(data.userId)
        clearTimeout(typingIndicatorTimeout.current)
        typingIndicatorTimeout.current = setTimeout(() => setTypingUser(null), 3000)
      }
      if (event === 'message_reaction' && data.messageId) {
        setLocalMessages((prev) =>
          prev.map((m) => m.id === data.messageId ? { ...m, reactions: data.reactions } : m),
        )
        qc.setQueryData(['messages', conversationId], (old) => {
          if (!Array.isArray(old)) return old
          return old.map((m) => m.id === data.messageId ? { ...m, reactions: data.reactions } : m)
        })
      }
    })
  }, [conversationId, subscribe, markRead, user, qc])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages.length])

  const scrollToMessage = useCallback((msgId) => {
    const el = messageRefs.current[msgId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('animate-pulse-soft')
      setTimeout(() => el.classList.remove('animate-pulse-soft'), 1500)
    }
  }, [])

  const doSend = async (text, attachmentUrl, attachmentType, replyToId) => {
    setSending(true)
    try {
      const msg = await sendMessage(conversationId, text || null, attachmentUrl, attachmentType, replyToId)
      if (msg) setLocalMessages((prev) => [...prev, msg])
      qc.invalidateQueries({ queryKey: ['conversations'] })
    } finally {
      setSending(false)
    }
  }

  const handleSendText = async () => {
    const text = body.trim()
    const hasDoc = !!docAttachment
    if ((!text && !hasDoc) || sending) return

    setBody('')
    const currentDoc = docAttachment
    const currentReply = replyTo
    setDocAttachment(null)
    setReplyTo(null)
    try {
      await doSend(
        text || null,
        currentDoc?.url || undefined,
        currentDoc?.type || undefined,
        currentReply?.id || undefined,
      )
    } catch {
      setBody(text)
      setDocAttachment(currentDoc)
      setReplyTo(currentReply)
    }
  }

  const handleMediaSend = async ({ url, type, caption }) => {
    const currentReply = replyTo
    setMediaPreview(null)
    setReplyTo(null)
    try {
      await doSend(caption, url, type, currentReply?.id || undefined)
    } catch {
      // modal already closed
    }
  }

  const handleTyping = () => {
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => startTyping(conversationId), 300)
  }

  const handleReact = async (msgId, emoji) => {
    try {
      await reactToMessage(msgId, emoji)
    } catch {
      // reaction failed silently
    }
  }

  const handleReply = (msg) => {
    setReplyTo({
      id: msg.id,
      body: msg.body,
      senderName: msg.senderId === user?.id ? 'You' : (conv?.dealerUserId === user?.id || conv?.technicianUserId === user?.id ? conv?.buyerName : (conv?.dealerShopName || conv?.technicianDisplayName)) || 'Unknown',
      attachmentType: msg.attachmentType,
    })
    textareaRef.current?.focus()
  }

  const loadOlder = useCallback(async () => {
    if (loadingMore || !allMessages.length) return
    setLoadingMore(true)
    try {
      const oldest = allMessages[0]
      const older = await apiJson(`/conversations/${conversationId}/messages?before=${oldest.createdAt}&limit=50`)
      if (Array.isArray(older) && older.length) {
        setLocalMessages((prev) => [...older, ...prev])
      }
    } finally {
      setLoadingMore(false)
    }
  }, [conversationId, allMessages, loadingMore])

  if (messagesQ.isLoading) return <LoadingSpinner />

  const isDealerSide = conv?.dealerUserId === user?.id
  const isTechSide = conv?.technicianUserId === user?.id
  const otherName = (isDealerSide || isTechSide)
    ? (conv?.buyerName || 'Buyer')
    : (conv?.dealerShopName || conv?.technicianDisplayName || 'Contact')

  const groups = groupByDate(allMessages)

  return (
    <div className={cn('flex flex-col', embedded ? 'h-full' : 'mx-auto h-[calc(100vh-8rem)] max-w-2xl')}>
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#f0f2f5] px-3 py-2.5 dark:bg-slate-800">
        {embedded ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200 md:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <Link
            to="/messages"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
          {(otherName[0] || 'D').toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{otherName}</p>
          {conv?.partName && (
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3 text-slate-400 dark:text-slate-500" />
              <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">Re: {conv.partName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Media preview replaces chat area when active */}
      {mediaPreview ? (
        <AttachmentPreviewModal
          file={mediaPreview.file}
          fileType={mediaPreview.fileType}
          onSend={handleMediaSend}
          onClose={() => setMediaPreview(null)}
        />
      ) : (
        <>
          {/* Messages area */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto"
            style={{
              backgroundColor: isDark ? DARK_BG : LIGHT_BG,
              backgroundImage: isDark ? DARK_PATTERN : LIGHT_PATTERN,
            }}
          >
            <div className="mx-auto max-w-2xl px-3 py-4">
              {allMessages.length >= 50 && (
                <div className="mb-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={loadingMore}
                    onClick={loadOlder}
                    className="rounded-full bg-white/80 text-xs text-slate-500 shadow-sm backdrop-blur-sm dark:bg-slate-800/80 dark:text-slate-400"
                  >
                    {loadingMore ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
                    Load older messages
                  </Button>
                </div>
              )}

              {allMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-800">
                    <Send className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Start the conversation</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Send a message to begin chatting.</p>
                </div>
              )}

              {groups.map((group) => (
                <div key={group.label}>
                  <div className="my-4 flex justify-center">
                    <span className="rounded-lg bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm dark:bg-slate-700/90 dark:text-slate-300">
                      {group.label}
                    </span>
                  </div>
                  {group.messages.map((msg, idx) => {
                    const isMine = msg.senderId === user?.id
                    const isMedia = hasMediaAttachment(msg)
                    const prevMsg = group.messages[idx - 1]
                    const isFirst = !prevMsg || prevMsg.senderId !== msg.senderId
                    const myReaction = msg.reactions?.find((r) => r.userIds?.includes(user?.id))

                    return (
                      <div
                        key={msg.id}
                        ref={(el) => { messageRefs.current[msg.id] = el }}
                        className={cn(
                          'flex',
                          isMine ? 'justify-end' : 'justify-start',
                          isFirst ? 'mt-3' : 'mt-0.5',
                        )}
                      >
                        <div className="max-w-[75%]">
                          <ReactionPicker
                            isMine={isMine}
                            currentEmoji={myReaction?.emoji}
                            onReact={(emoji) => handleReact(msg.id, emoji)}
                            onReply={() => handleReply(msg)}
                          >
                            <div
                              className={cn(
                                'relative overflow-hidden text-[13.5px] leading-[19px] shadow',
                                isMedia ? 'p-0' : 'px-2.5 py-1.5',
                                isMine
                                  ? 'rounded-lg bg-[#d9fdd3] text-slate-800 dark:bg-emerald-900/60 dark:text-slate-100'
                                  : 'rounded-lg bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100',
                                isMine && isFirst && 'rounded-tr-none',
                                !isMine && isFirst && 'rounded-tl-none',
                              )}
                            >
                              <MessageContent msg={msg} onScrollToMessage={scrollToMessage} />
                              {(!isMedia || msg.body) ? (
                                <span className="float-right ml-3 mt-1 inline-flex items-center gap-1 text-[10.5px] leading-none text-slate-400 dark:text-slate-400">
                                  {timeStr(msg.createdAt)}
                                </span>
                              ) : null}
                            </div>
                          </ReactionPicker>
                          <ReactionChips
                            reactions={msg.reactions}
                            userId={user?.id}
                            onToggle={(emoji) => handleReact(msg.id, emoji)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}

              {typingUser && (
                <div className="mt-2 flex justify-start">
                  <div className="rounded-lg rounded-tl-none bg-white px-3 py-2 shadow dark:bg-slate-700">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div className="space-y-2 bg-[#f0f2f5] px-3 py-2 dark:bg-slate-800">
            {replyTo && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700">
                <div className="w-1 self-stretch rounded bg-emerald-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    {replyTo.senderName}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {replyTo.body || ATTACHMENT_PREVIEW_LABELS[replyTo.attachmentType] || 'Message'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {docAttachment && (
              <DocumentPreview
                attachment={docAttachment}
                onRemove={() => setDocAttachment(null)}
              />
            )}

            {recording ? (
              <VoiceRecorder
                stream={voiceStream}
                onComplete={async (data) => {
                  setRecording(false)
                  setVoiceStream(null)
                  try {
                    await doSend(null, data.url, data.type, replyTo?.id || undefined)
                    setReplyTo(null)
                  } catch { /* voice note send failed */ }
                }}
                onCancel={() => { setRecording(false); setVoiceStream(null) }}
              />
            ) : (
              <div className="flex items-end gap-2">
                <AttachmentPicker
                  disabled={sending}
                  onMediaSelect={(data) => setMediaPreview(data)}
                  onDocumentSelect={(data) => setDocAttachment(data)}
                  onVoiceNote={async () => {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                      setVoiceStream(stream)
                      setRecording(true)
                    } catch (err) {
                      console.error('Microphone access denied:', err)
                    }
                  }}
                  onLocationSelect={async ({ lat, lng }) => {
                    const url = `https://www.google.com/maps?q=${lat},${lng}`
                    try {
                      await doSend(`📍 Shared location\n${url}`, null, null, replyTo?.id || undefined)
                      setReplyTo(null)
                    } catch { /* location send failed */ }
                  }}
                />
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendText()
                  }}
                  className="flex min-h-[42px] flex-1 items-end gap-2 rounded-full bg-white px-3 shadow-sm dark:bg-slate-700"
                >
                  <textarea
                    ref={textareaRef}
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value)
                      handleTyping()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendText()
                      }
                    }}
                    placeholder="Type a message"
                    rows={1}
                    className="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </form>
                <button
                  type="button"
                  disabled={(!body.trim() && !docAttachment) || sending}
                  onClick={handleSendText}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all',
                    (body.trim() || docAttachment) && !sending
                      ? 'bg-emerald-500 text-white shadow-md hover:bg-emerald-600'
                      : 'bg-emerald-500/50 text-white/70',
                  )}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
