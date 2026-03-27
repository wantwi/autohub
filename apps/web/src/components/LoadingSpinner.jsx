import { cn } from '@/lib/utils'

export function LoadingSpinner({ label = 'Loading…', className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16', className)}>
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-700" />
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-slate-900 dark:border-t-slate-100" />
      </div>
      {label && <p className="mt-4 text-sm font-medium text-slate-500 animate-pulse-soft dark:text-slate-400">{label}</p>}
    </div>
  )
}
