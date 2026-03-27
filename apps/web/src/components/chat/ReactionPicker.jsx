import { useEffect, useRef, useState } from 'react'
import { Reply } from 'lucide-react'
import { cn } from '@/lib/utils'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export function ReactionPicker({ onReact, onReply, isMine, currentEmoji, children }) {
  const [visible, setVisible] = useState(false)
  const longPressTimer = useRef(null)
  const containerRef = useRef(null)

  const showPicker = () => setVisible(true)
  const hidePicker = () => setVisible(false)

  const handlePointerDown = () => {
    longPressTimer.current = setTimeout(showPicker, 400)
  }

  const handlePointerUp = () => {
    clearTimeout(longPressTimer.current)
  }

  useEffect(() => {
    if (!visible) return
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        hidePicker()
      }
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [visible])

  return (
    <div
      ref={containerRef}
      className="group relative"
      onMouseEnter={showPicker}
      onMouseLeave={hidePicker}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
      {visible && (
        <div
          className={cn(
            'absolute z-30 flex animate-scale-in items-center gap-0.5 rounded-full border border-slate-200/80 bg-white px-1.5 py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800',
            isMine ? 'right-0 bottom-full mb-1' : 'left-0 bottom-full mb-1',
          )}
        >
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onReact(emoji)
                hidePicker()
              }}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all hover:scale-125 hover:bg-slate-100 dark:hover:bg-slate-700',
                currentEmoji === emoji && 'bg-slate-100 ring-2 ring-emerald-400 dark:bg-slate-700',
              )}
            >
              {emoji}
            </button>
          ))}
          <div className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-600" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onReply()
              hidePicker()
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-all hover:scale-110 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            title="Reply"
          >
            <Reply className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
