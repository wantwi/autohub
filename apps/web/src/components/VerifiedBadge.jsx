import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function VerifiedBadge({ className, title = 'Verified dealer' }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-brand-700', className)}
      title={title}
    >
      <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden />
      <span className="sr-only">{title}</span>
    </span>
  )
}
