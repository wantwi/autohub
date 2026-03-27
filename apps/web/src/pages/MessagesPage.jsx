import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { ChatInboxPage } from '@/pages/ChatInboxPage'
import { ChatThreadPage } from '@/pages/ChatThreadPage'
import { cn } from '@/lib/utils'

export function MessagesPage() {
  const { id: paramId } = useParams()
  const navigate = useNavigate()
  const [activeId, setActiveId] = useState(paramId || null)

  useEffect(() => {
    if (paramId && paramId !== activeId) {
      setActiveId(paramId)
    }
  }, [paramId])

  const handleSelect = (id) => {
    setActiveId(id)
    navigate(`/messages/${id}`, { replace: true })
  }

  const handleBack = () => {
    setActiveId(null)
    navigate('/messages', { replace: true })
  }

  const hasActive = !!activeId

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {/* Left panel */}
      <div
        className={cn(
          'flex-shrink-0 border-r border-slate-200 dark:border-slate-700',
          hasActive ? 'hidden w-[340px] md:flex md:flex-col' : 'flex w-full flex-col md:w-[340px]',
        )}
      >
        <ChatInboxPage sidebar activeId={activeId} onSelect={handleSelect} />
      </div>

      {/* Right panel */}
      <div className={cn('min-w-0 flex-1', hasActive ? 'flex flex-col' : 'hidden md:flex md:flex-col')}>
        {activeId ? (
          <ChatThreadPage key={activeId} conversationId={activeId} embedded onBack={handleBack} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-[#f0f2f5] dark:bg-slate-800">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <MessageCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">AutoHub Messages</h3>
            <p className="mt-1 max-w-xs text-center text-sm text-slate-500 dark:text-slate-400">
              Select a conversation from the left to start chatting, or browse dealers to send a new message.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
