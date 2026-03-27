import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, ClipboardList, PackagePlus, ShieldCheck } from 'lucide-react'
import { apiJson } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export function AdminDashboardPage() {
  const q = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => apiJson('/dealers/admin/overview'),
  })

  if (q.isLoading) return <LoadingSpinner />

  const data = q.data || {}
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Admin workspace</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Manage dealer onboarding and upload listings on behalf of dealers.</p>
          </div>
          <ShieldCheck className="h-8 w-8 text-slate-900 dark:text-slate-100" aria-hidden />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Total dealers</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{Number(data.totalDealers || 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Pending onboarding</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-amber-700 dark:text-amber-400">{Number(data.pendingOnboarding || 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Approved onboarding</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-brand-700 dark:text-brand-400">{Number(data.approvedOnboarding || 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-600 dark:text-slate-400">Verified dealers</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-blue-700 dark:text-blue-400">{Number(data.verifiedDealers || 0)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/admin/onboarding" className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              Dealer onboarding
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/dealer-parts" className="inline-flex items-center gap-1.5">
              <PackagePlus className="h-4 w-4" />
              Upload listing for dealer
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/onboarding" className="inline-flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" />
              Review onboarding queue
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

