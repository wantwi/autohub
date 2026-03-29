import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DealerGate } from '@/components/DealerGate'
import { AdminGate } from '@/components/AdminGate'
import { TechnicianGate } from '@/components/TechnicianGate'
import { LoadingSpinner } from '@/components/LoadingSpinner'

const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const SearchResultsPage = lazy(() =>
  import('@/pages/SearchResultsPage').then((m) => ({ default: m.SearchResultsPage })),
)
const PartDetailPage = lazy(() => import('@/pages/PartDetailPage').then((m) => ({ default: m.PartDetailPage })))
const DealersPage = lazy(() => import('@/pages/DealersPage').then((m) => ({ default: m.DealersPage })))
const DealerProfilePage = lazy(() =>
  import('@/pages/DealerProfilePage').then((m) => ({ default: m.DealerProfilePage })),
)
const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })))
const BuyerDashboard = lazy(() => import('@/pages/BuyerDashboard').then((m) => ({ default: m.BuyerDashboard })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const DealerRegisterPage = lazy(() =>
  import('@/pages/DealerRegisterPage').then((m) => ({ default: m.DealerRegisterPage })),
)
const DealerDashboard = lazy(() => import('@/pages/DealerDashboard').then((m) => ({ default: m.DealerDashboard })))
const DealerPartsPage = lazy(() => import('@/pages/DealerPartsPage').then((m) => ({ default: m.DealerPartsPage })))
const PartFormPage = lazy(() => import('@/pages/PartFormPage').then((m) => ({ default: m.PartFormPage })))
const DealerOrdersPage = lazy(() => import('@/pages/DealerOrdersPage').then((m) => ({ default: m.DealerOrdersPage })))
const DealerProfileEditPage = lazy(() =>
  import('@/pages/DealerProfileEditPage').then((m) => ({ default: m.DealerProfileEditPage })),
)
const AdminDashboardPage = lazy(() =>
  import('@/pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)
const AdminOnboardingPage = lazy(() =>
  import('@/pages/AdminOnboardingPage').then((m) => ({ default: m.AdminOnboardingPage })),
)
const AdminDealerPartsPage = lazy(() =>
  import('@/pages/AdminDealerPartsPage').then((m) => ({ default: m.AdminDealerPartsPage })),
)
const MessagesPage = lazy(() => import('@/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })))
const TechniciansPage = lazy(() =>
  import('@/pages/TechniciansPage').then((m) => ({ default: m.TechniciansPage })),
)
const TechnicianProfilePage = lazy(() =>
  import('@/pages/TechnicianProfilePage').then((m) => ({ default: m.TechnicianProfilePage })),
)
const TechnicianDashboard = lazy(() =>
  import('@/pages/TechnicianDashboard').then((m) => ({ default: m.TechnicianDashboard })),
)
const TechnicianProfileEditPage = lazy(() =>
  import('@/pages/TechnicianProfileEditPage').then((m) => ({ default: m.TechnicianProfileEditPage })),
)
const TechnicianRequestsPage = lazy(() =>
  import('@/pages/TechnicianRequestsPage').then((m) => ({ default: m.TechnicianRequestsPage })),
)
const BuyerBookingsPage = lazy(() =>
  import('@/pages/BuyerBookingsPage').then((m) => ({ default: m.BuyerBookingsPage })),
)
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
)
const TermsPage = lazy(() => import('@/pages/TermsPage').then((m) => ({ default: m.TermsPage })))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))
const FeedbackPage = lazy(() => import('@/pages/FeedbackPage').then((m) => ({ default: m.FeedbackPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

function SuspenseFallback() {
  return (
    <div className="py-16">
      <LoadingSpinner />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchResultsPage />} />
          <Route path="parts/:id" element={<PartDetailPage />} />
          <Route path="dealers" element={<DealersPage />} />
          <Route path="dealers/:id" element={<DealerProfilePage />} />
          <Route path="services" element={<TechniciansPage />} />
          <Route path="services/:id" element={<TechnicianProfilePage />} />
          <Route path="login" element={<AuthPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />

          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <BuyerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="feedback"
            element={
              <ProtectedRoute>
                <FeedbackPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="bookings"
            element={
              <ProtectedRoute>
                <BuyerBookingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="messages/:id"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="dealer/register"
            element={
              <ProtectedRoute>
                <DealerRegisterPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="dealer"
            element={
              <ProtectedRoute>
                <DealerGate />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DealerDashboard />} />
            <Route path="parts" element={<DealerPartsPage />} />
            <Route path="parts/new" element={<PartFormPage />} />
            <Route path="parts/:id/edit" element={<PartFormPage />} />
            <Route path="orders" element={<DealerOrdersPage />} />
            <Route path="profile" element={<DealerProfileEditPage />} />
          </Route>

          <Route
            path="technician"
            element={
              <ProtectedRoute>
                <TechnicianGate />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<TechnicianDashboard />} />
            <Route path="profile" element={<TechnicianProfileEditPage />} />
            <Route path="requests" element={<TechnicianRequestsPage />} />
          </Route>

          <Route
            path="admin"
            element={
              <ProtectedRoute>
                <AdminGate />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="onboarding" element={<AdminOnboardingPage />} />
            <Route path="dealer-parts" element={<AdminDealerPartsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
