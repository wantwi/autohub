import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  GitCompareArrows,
  MessageCircle,
  Search,
  Wrench,
  Zap,
  Car,
  Snowflake,
  Disc3,
  ScanSearch,
  TruckIcon,
  PanelTop,
} from 'lucide-react'
import { apiJson } from '@/lib/api'
import { normalizeList } from '@/lib/normalize'
import { SearchBar } from '@/components/SearchBar'
import { DealerCard } from '@/components/DealerCard'
import { PartCard } from '@/components/PartCard'
import { TechnicianCard } from '@/components/TechnicianCard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    n: 1,
    title: 'Search parts or services',
    description: 'Find spare parts by make, model and year — or browse technicians by specialization.',
    Icon: Search,
  },
  {
    n: 2,
    title: 'Compare & choose',
    description: 'Compare prices across dealers or check technician ratings, reviews, and availability.',
    Icon: GitCompareArrows,
  },
  {
    n: 3,
    title: 'Connect & book',
    description: 'Message a dealer to arrange pickup, or book a technician for a service visit.',
    Icon: MessageCircle,
  },
]

const SPEC_PILLS = [
  { value: 'mechanic', label: 'Mechanic', Icon: Wrench },
  { value: 'electrician', label: 'Auto Electrician', Icon: Zap },
  { value: 'body_work', label: 'Body Work', Icon: Car },
  { value: 'ac_tech', label: 'AC Tech', Icon: Snowflake },
  { value: 'tyre_alignment', label: 'Tyre & Alignment', Icon: Disc3 },
  { value: 'diagnostics', label: 'Diagnostics', Icon: ScanSearch },
  { value: 'towing', label: 'Towing', Icon: TruckIcon },
  { value: 'glass', label: 'Windscreen', Icon: PanelTop },
]

export function HomePage() {
  const dealersQ = useQuery({
    queryKey: ['dealers', { featured: true }],
    queryFn: () => apiJson('/dealers?pageSize=6'),
  })
  const partsQ = useQuery({
    queryKey: ['parts', 'highlights'],
    queryFn: () => apiJson('/parts?pageSize=8&sort=created_at:desc'),
  })
  const techniciansQ = useQuery({
    queryKey: ['technicians', 'home-featured'],
    queryFn: () => apiJson('/technicians?pageSize=6'),
  })

  const { items: dealers } = normalizeList(dealersQ.data)
  const { items: parts } = normalizeList(partsQ.data)
  const { items: technicians } = normalizeList(techniciansQ.data)

  return (
    <div className="space-y-16 pb-8">
      <section
        className="animate-fade-in-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-14 shadow-xl sm:px-10 sm:py-16 md:py-20"
        style={{ animationDelay: '0ms' }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-500/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-3xl text-center md:text-left">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-400/90">
            AutoHub Ghana
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Find it. Fix it. Drive it.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300 md:mx-0">
            Find spare parts from verified dealers and book trusted technicians — all in one place.
          </p>
          <div className="mx-auto mt-8 max-w-4xl rounded-xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-md md:mx-0 md:p-5">
            <SearchBar className="[&_input]:border-slate-200/80 [&_input]:bg-white/95 [&_input]:shadow-sm" />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
            <Button asChild size="lg" className="gap-2 shadow-lg shadow-brand-600/30">
              <Link to="/search">
                <Search className="h-4 w-4" aria-hidden />
                Browse Parts
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="gap-2 border border-white/20 !text-white hover:bg-white/10">
              <Link to="/services">
                <Wrench className="h-4 w-4" aria-hidden />
                Find a Technician
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '80ms' }}
      >
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-700 dark:text-brand-400">How it works</h2>
            <p className="mt-1 max-w-lg text-sm text-slate-600 dark:text-slate-400">
              Three simple steps from search to your doorstep.
            </p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, idx) => (
            <Card
              key={step.title}
              className={cn(
                'group animate-fade-in-up border-slate-200/80 shadow-sm transition-all duration-300 dark:border-slate-700/80 dark:shadow-slate-900/50',
                'hover:-translate-y-0.5 hover:border-brand-200/60 hover:shadow-lg',
              )}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <CardContent className="flex flex-col gap-4 p-6 pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white shadow-md ring-4 ring-brand-500/20">
                    {step.n}
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-brand-600 transition-colors group-hover:bg-brand-50 dark:bg-slate-800 dark:text-brand-400 dark:group-hover:bg-brand-500/15">
                    <step.Icon className="h-6 w-6" aria-hidden />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{step.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '160ms' }}
      >
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Featured dealers</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Trusted shops with ratings and verified profiles.</p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to="/dealers">View all</Link>
          </Button>
        </div>
        {dealersQ.isLoading ? <LoadingSpinner /> : null}
        {dealersQ.isError ? (
          <EmptyState
            title="Could not load dealers"
            description="Check API URL or try again later."
            actionLabel="Retry"
            actionTo="/"
          />
        ) : null}
        {dealersQ.isSuccess && dealers.length === 0 ? (
          <EmptyState title="No dealers yet" description="Pilot catalogue is warming up." />
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {dealers.map((d, idx) => (
            <div
              key={d.id}
              className="group animate-fade-in-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="h-full transition-transform duration-300 group-hover:-translate-y-1">
                <DealerCard dealer={d} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Technician specialization pills + featured technicians */}
      <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Need a fix?</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Browse by specialization or explore top-rated technicians.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to="/services">View all</Link>
          </Button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {SPEC_PILLS.map((sp, idx) => (
            <Link
              key={sp.value}
              to={`/services?specialization=${sp.value}`}
              className={cn(
                'animate-fade-in-up inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200',
                'hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 hover:shadow-md',
                'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-600/50 dark:hover:bg-brand-950/40 dark:hover:text-brand-300',
              )}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <sp.Icon className="h-3.5 w-3.5" aria-hidden />
              {sp.label}
            </Link>
          ))}
        </div>

        {techniciansQ.isLoading ? <LoadingSpinner /> : null}
        {techniciansQ.isSuccess && technicians.length === 0 ? (
          <EmptyState title="No technicians yet" description="Service providers will appear here once onboarded." />
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {technicians.map((t, idx) => (
            <div
              key={t.id}
              className="group animate-fade-in-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="h-full transition-transform duration-300 group-hover:-translate-y-1">
                <TechnicianCard technician={t} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="animate-fade-in-up"
        style={{ animationDelay: '280ms' }}
      >
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Recent parts</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Fresh listings from the marketplace.</p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to="/search">Search</Link>
          </Button>
        </div>
        {partsQ.isLoading ? <LoadingSpinner /> : null}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {parts.map((p, idx) => (
            <div
              key={p.id}
              className="group animate-fade-in-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="h-full transition-transform duration-300 group-hover:-translate-y-1">
                <PartCard part={p} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
