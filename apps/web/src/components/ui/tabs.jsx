import { cn } from '@/lib/utils'

export function Tabs({ children, className, ...props }) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}

export function TabsList({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-xl bg-slate-100/80 p-1 dark:bg-slate-800/80',
        className,
      )}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ active, children, className, ...props }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
          : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function TabsContent({ active, children, className, ...props }) {
  if (!active) return null
  return (
    <div className={cn('animate-fade-in', className)} role="tabpanel" {...props}>
      {children}
    </div>
  )
}
