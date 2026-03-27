import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20">
      <div className="animate-fade-in-up flex max-w-md flex-col items-center text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">AutoHub</p>
        <span
          className="mt-4 bg-gradient-to-b from-slate-800 to-slate-600 bg-clip-text text-8xl font-black tracking-tighter text-transparent sm:text-9xl"
          aria-hidden
        >
          404
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Page not found</h1>
        <p className="mt-3 max-w-sm text-base leading-relaxed text-slate-600 dark:text-slate-400">
          The page you’re looking for doesn’t exist or was moved. Head back home to keep browsing parts and dealers.
        </p>
        <Button
          variant="brand"
          size="lg"
          className="mt-8 animate-bounce-in shadow-lg shadow-brand-500/20 dark:shadow-brand-500/10"
          asChild
        >
          <Link to="/" className="gap-2">
            <Home className="h-4 w-4" aria-hidden />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  )
}
