import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export function Stepper({ steps, current, className }) {
  return (
    <nav className={cn('flex items-center', className)}>
      {steps.map((step, idx) => {
        const isCompleted = idx < current
        const isActive = idx === current
        return (
          <div key={step.label} className="flex items-center">
            {idx > 0 && (
              <div
                className={cn(
                  'mx-3 h-px w-10 transition-colors duration-300',
                  isCompleted ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700',
                )}
              />
            )}
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300',
                  isCompleted
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-200 dark:shadow-brand-900'
                    : isActive
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </span>
              <span
                className={cn(
                  'text-sm font-medium transition-colors duration-200',
                  isActive ? 'text-slate-900 dark:text-slate-100' : isCompleted ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500',
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
