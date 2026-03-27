import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const LENGTH = 6

export function OTPInput({ value, onChange, disabled, className }) {
  const refs = useRef(/** @type {(HTMLInputElement | null)[]} */ ([]))
  const [digits, setDigits] = useState(() => {
    const v = (value || '').replace(/\D/g, '').slice(0, LENGTH)
    return v.padEnd(LENGTH, ' ').split('')
  })

  const emit = (arr) => {
    const s = arr.join('').replace(/\s/g, '')
    onChange?.(s)
  }

  const updateAt = (index, char) => {
    const next = [...digits]
    next[index] = char === '' ? ' ' : char
    setDigits(next)
    emit(next)
  }

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) {
      updateAt(index, '')
      return
    }
    let pos = index
    for (const ch of raw) {
      if (pos >= LENGTH) break
      updateAt(pos, ch)
      pos += 1
    }
    const nextFocus = Math.min(pos, LENGTH - 1)
    refs.current[nextFocus]?.focus()
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && (!digits[index] || digits[index] === ' ')) {
      e.preventDefault()
      if (index > 0) {
        updateAt(index - 1, '')
        refs.current[index - 1]?.focus()
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < LENGTH - 1) refs.current[index + 1]?.focus()
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!text) return
    const next = Array(LENGTH)
      .fill(' ')
      .map((_, i) => text[i] || ' ')
    setDigits(next)
    emit(next)
    refs.current[Math.min(text.length, LENGTH - 1)]?.focus()
  }

  return (
    <div className={cn('flex gap-2 justify-center', className)} onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          className="h-12 w-10 rounded-md border border-slate-300 text-center text-lg font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          value={d === ' ' ? '' : d}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
        />
      ))}
    </div>
  )
}
