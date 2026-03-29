import { createElement, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bell,
  Boxes,
  Car,
  ChevronRight,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  CalendarClock,
  Package,
  Search,
  ShieldCheck,
  Store,
  User,
  Wrench,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useChatUnread } from '@/providers/ChatProvider'
import { subscribeToPush, isPushSubscribed, hasDismissedPushPrompt, dismissPushPrompt } from '@/lib/pushSubscription'
import { Button } from '@/components/ui/button'
import { ThemePicker } from '@/components/ThemePicker'

let deferredInstallPrompt = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredInstallPrompt = e
  })
}

function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    const isInStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone
    const dismissed = localStorage.getItem('autohub-pwa-install-dismissed')
    if (isInStandalone || dismissed) return

    const iosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIos(iosDevice)

    if (iosDevice || deferredInstallPrompt) {
      const timer = setTimeout(() => setVisible(true), 2000)
      return () => clearTimeout(timer)
    }

    const handler = () => { setVisible(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem('autohub-pwa-install-dismissed', '1')
    setVisible(false)
  }

  const handleInstall = async () => {
    if (!deferredInstallPrompt) return
    deferredInstallPrompt.prompt()
    const { outcome } = await deferredInstallPrompt.userChoice
    if (outcome === 'accepted') setVisible(false)
    deferredInstallPrompt = null
  }

  return (
    <div className="mb-4 animate-fade-in-up rounded-xl border border-sky-200/60 bg-sky-50/80 p-3 shadow-sm dark:border-sky-800/40 dark:bg-sky-950/30">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
          <Car className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Install AutoHub</p>
          {isIos ? (
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Tap the <strong>Share</strong> button <span className="inline-block translate-y-px text-base leading-none">&#x2191;&#xFE0E;</span> at the bottom of Safari, then tap <strong>&quot;Add to Home Screen&quot;</strong>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Add AutoHub to your home screen for faster access and offline support.
            </p>
          )}
          <div className="mt-2 flex gap-2">
            {!isIos && deferredInstallPrompt && (
              <button type="button" onClick={handleInstall} className="rounded-lg bg-sky-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-sky-700">
                Install
              </button>
            )}
            <button type="button" onClick={dismiss} className="rounded-lg px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PushPromptBanner() {
  const user = useAuthStore((s) => s.user)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!user) return
    if (isPushSubscribed() || hasDismissedPushPrompt()) return
    if (!('Notification' in window) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return
    const timer = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(timer)
  }, [user])

  if (!visible) return null

  const handleEnable = async () => {
    setVisible(false)
    await subscribeToPush().catch(() => {})
  }
  const handleDismiss = () => {
    dismissPushPrompt()
    setVisible(false)
  }

  return (
    <div className="mb-4 animate-fade-in-up rounded-xl border border-brand-200/60 bg-brand-50/80 p-3 shadow-sm dark:border-brand-800/40 dark:bg-brand-950/30">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enable notifications</p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Get notified about new messages and booking updates.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={handleEnable} className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-brand-700">
              Enable
            </button>
            <button type="button" onClick={handleDismiss} className="rounded-lg px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NavItem({ to, icon, label, end, mobile = false, badge = 0 }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          mobile
            ? cn(
                'flex-col gap-0.5 rounded-xl px-2 py-1.5 text-[11px]',
                isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500',
              )
            : cn(
                isActive
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
              ),
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            {createElement(icon, {
              className: cn(
                'shrink-0 transition-transform duration-200 group-hover:scale-110',
                mobile ? 'h-5 w-5' : 'h-4 w-4',
              ),
              'aria-hidden': true,
            })}
            {badge > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand-600 px-0.5 text-[9px] font-bold leading-none text-white">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </span>
          <span>{label}</span>
          {!mobile && isActive && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60 dark:bg-slate-900/60" />
          )}
          {mobile && isActive && (
            <span className="h-1 w-4 rounded-full bg-slate-900 dark:bg-white" />
          )}
        </>
      )}
    </NavLink>
  )
}

function SidebarSection({ title, children }) {
  return (
    <div className="space-y-1">
      {title && (
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {title}
        </p>
      )}
      {children}
    </div>
  )
}

export function AppShell() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const isDealer = user?.role === 'dealer'
  const isAdmin = user?.role === 'admin'
  const isTechnician = user?.role === 'technician'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const chatUnread = useChatUnread()

  const hideChrome = location.pathname.startsWith('/login')
  if (hideChrome) {
    return (
      <div className="relative min-h-dvh bg-slate-50 pt-[env(safe-area-inset-top)] dark:bg-slate-950">
        <div className="fixed right-4 top-[calc(1rem+env(safe-area-inset-top))] z-50">
          <ThemePicker />
        </div>
        <Outlet />
      </div>
    )
  }

  const displayName =
    user?.fullName ?? user?.full_name ?? (isAdmin ? 'Admin' : isDealer ? 'Dealer' : isTechnician ? 'Technician' : 'Buyer')
  const initials = displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-dvh bg-slate-50 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-bold text-slate-900 transition-opacity hover:opacity-80 dark:text-white"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <Car className="h-4 w-4" />
            </div>
            <span className="text-base tracking-tight">AutoHub</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {isTechnician ? (
              <>
                <NavLink to="/technician/dashboard" end className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-slate-900 bg-slate-100 dark:text-white dark:bg-slate-800' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')}>Dashboard</NavLink>
                <NavLink to="/technician/requests" className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-slate-900 bg-slate-100 dark:text-white dark:bg-slate-800' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')}>Requests</NavLink>
                <NavLink to="/messages" className={({ isActive }) => cn('relative rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-slate-900 bg-slate-100 dark:text-white dark:bg-slate-800' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')}>
                  Messages
                  {chatUnread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{chatUnread > 99 ? '99+' : chatUnread}</span>}
                </NavLink>
                <NavLink to="/technician/profile" className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-slate-900 bg-slate-100 dark:text-white dark:bg-slate-800' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')}>Profile</NavLink>
              </>
            ) : !isDealer && !isAdmin && (
              <>
                <NavLink to="/" end className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-slate-900 bg-slate-100 dark:text-white dark:bg-slate-800' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')}>Home</NavLink>
                <NavLink to="/search" className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-slate-900 bg-slate-100 dark:text-white dark:bg-slate-800' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')}>Search</NavLink>
                <NavLink to="/dealers" className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-slate-900 bg-slate-100 dark:text-white dark:bg-slate-800' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')}>Dealers</NavLink>
                <NavLink to="/services" className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-slate-900 bg-slate-100 dark:text-white dark:bg-slate-800' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')}>Services</NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <ThemePicker />
            {user ? (
              <div className="hidden items-center gap-3 md:flex">
                <div className="flex items-center gap-2.5 rounded-full bg-slate-100 py-1.5 pl-1.5 pr-4 dark:bg-slate-800">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-slate-200 dark:text-slate-900">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{displayName}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button asChild size="sm" className="hidden md:inline-flex">
                <Link to="/login">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
              </Button>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="animate-fade-in-down border-t border-slate-100 bg-white px-4 py-3 md:hidden dark:border-slate-700 dark:bg-slate-900">
            <div className="space-y-1">
              {isAdmin ? (
                <>
                  <MobileLink to="/admin/dashboard" icon={ShieldCheck} label="Overview" onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/admin/onboarding" icon={User} label="Onboarding" onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/admin/dealer-parts" icon={Boxes} label="Upload" onClick={() => setMobileMenuOpen(false)} />
                </>
              ) : isTechnician ? (
                <>
                  <MobileLink to="/technician/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/technician/requests" icon={ClipboardList} label="Requests" onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/technician/profile" icon={User} label="Profile" onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/messages" icon={MessageCircle} label={`Messages${chatUnread > 0 ? ` (${chatUnread})` : ''}`} onClick={() => setMobileMenuOpen(false)} />
                </>
              ) : isDealer ? (
                <>
                  <MobileLink to="/dealer/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/dealer/orders" icon={Package} label="Orders" onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/dealer/parts" icon={Boxes} label="Listings" onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/dealer/profile" icon={User} label="Profile" onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/messages" icon={MessageCircle} label={`Messages${chatUnread > 0 ? ` (${chatUnread})` : ''}`} onClick={() => setMobileMenuOpen(false)} />
                </>
              ) : (
                <>
                  <MobileLink to="/" icon={Home} label="Home" onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/search" icon={Search} label="Search" onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/dealers" icon={Store} label="Dealers" onClick={() => setMobileMenuOpen(false)} />
                  {user && (
                    <>
                      <MobileLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
                      <MobileLink to="/bookings" icon={CalendarClock} label="Bookings" onClick={() => setMobileMenuOpen(false)} />
                      <MobileLink to="/messages" icon={MessageCircle} label={`Messages${chatUnread > 0 ? ` (${chatUnread})` : ''}`} onClick={() => setMobileMenuOpen(false)} />
                    </>
                  )}
                </>
              )}
              {user ? (
                <button
                  type="button"
                  onClick={() => { logout(); setMobileMenuOpen(false) }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              ) : (
                <MobileLink to="/login" icon={LogIn} label="Sign in" onClick={() => setMobileMenuOpen(false)} />
              )}
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-6">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 md:block">
          <nav className="sticky top-20 space-y-6">
            {/* User card */}
            {user && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-600 text-sm font-bold text-white shadow-sm dark:from-slate-300 dark:to-slate-400 dark:text-slate-900">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{displayName}</p>
                    <p className="text-xs text-slate-500 capitalize dark:text-slate-400">
                      {isAdmin ? 'Administrator' : isDealer ? 'Dealer' : isTechnician ? 'Technician' : 'Buyer'} account
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isAdmin ? (
              <>
                <SidebarSection title="Admin">
                  <NavItem to="/admin/dashboard" icon={ShieldCheck} label="Overview" end />
                  <NavItem to="/admin/onboarding" icon={User} label="Onboarding" />
                  <NavItem to="/admin/dealer-parts" icon={Boxes} label="Upload for dealer" />
                </SidebarSection>
                <SidebarSection title="Browse">
                  <NavItem to="/" icon={Home} label="Home" end />
                  <NavItem to="/dealers" icon={Store} label="Dealers" />
                  <NavItem to="/services" icon={Wrench} label="Services" />
                </SidebarSection>
              </>
            ) : isTechnician ? (
              <>
                <SidebarSection title="Services">
                  <NavItem to="/technician/dashboard" icon={LayoutDashboard} label="Overview" end />
                  <NavItem to="/technician/requests" icon={ClipboardList} label="Service requests" />
                  <NavItem to="/technician/profile" icon={User} label="My profile" />
                  <NavItem to="/messages" icon={MessageCircle} label="Messages" badge={chatUnread} />
                </SidebarSection>
                <SidebarSection title="Browse">
                  <NavItem to="/" icon={Home} label="Home" end />
                  <NavItem to="/search" icon={Search} label="Search parts" />
                  <NavItem to="/dealers" icon={Store} label="Dealers" />
                  <NavItem to="/services" icon={Wrench} label="Services" />
                </SidebarSection>
              </>
            ) : isDealer ? (
              <>
                <SidebarSection title="Dealer">
                  <NavItem to="/dealer/dashboard" icon={LayoutDashboard} label="Overview" end />
                  <NavItem to="/dealer/parts" icon={Boxes} label="My listings" />
                  <NavItem to="/dealer/profile" icon={User} label="Shop profile" />
                  <NavItem to="/messages" icon={MessageCircle} label="Messages" badge={chatUnread} />
                </SidebarSection>
                <SidebarSection title="Browse">
                  <NavItem to="/" icon={Home} label="Home" end />
                  <NavItem to="/search" icon={Search} label="Search parts" />
                  <NavItem to="/dealers" icon={Store} label="Dealers" />
                  <NavItem to="/services" icon={Wrench} label="Services" />
                </SidebarSection>
              </>
            ) : (
              <SidebarSection>
                <NavItem to="/" icon={Home} label="Home" end />
                <NavItem to="/search" icon={Search} label="Search parts" />
                <NavItem to="/dealers" icon={Store} label="Dealers" />
                <NavItem to="/services" icon={Wrench} label="Services" />
                {user ? (
                  <>
                    <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                    <NavItem to="/bookings" icon={CalendarClock} label="Bookings" />
                    <NavItem to="/messages" icon={MessageCircle} label="Messages" badge={chatUnread} />
                    <NavItem to="/profile" icon={User} label="Profile" />
                  </>
                ) : (
                  <NavItem to="/login" icon={LogIn} label="Sign in" />
                )}
              </SidebarSection>
            )}
          </nav>
        </aside>

        {/* Main content with page transition */}
        <main className="min-w-0 flex-1 animate-fade-in-up">
          <PwaInstallPrompt />
          <PushPromptBanner />
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-slate-700/80 dark:bg-slate-900" style={{ transform: 'translateZ(0)' }}>
        <div className="mx-auto flex max-w-lg justify-around px-1 py-1.5">
          {isAdmin ? (
            <>
              <NavItem to="/admin/dashboard" icon={ShieldCheck} label="Admin" end mobile />
              <NavItem to="/admin/onboarding" icon={User} label="Onboard" mobile />
              <NavItem to="/admin/dealer-parts" icon={Boxes} label="Upload" mobile />
              <NavItem to="/" icon={Home} label="Home" mobile />
            </>
          ) : isTechnician ? (
            <>
              <NavItem to="/technician/dashboard" icon={LayoutDashboard} label="Overview" end mobile />
              <NavItem to="/technician/requests" icon={ClipboardList} label="Requests" mobile />
              <NavItem to="/messages" icon={MessageCircle} label="Chat" badge={chatUnread} mobile />
              <NavItem to="/technician/profile" icon={User} label="Profile" mobile />
            </>
          ) : isDealer ? (
            <>
              <NavItem to="/dealer/dashboard" icon={LayoutDashboard} label="Overview" end mobile />
              <NavItem to="/dealer/parts" icon={Boxes} label="Parts" mobile />
              <NavItem to="/messages" icon={MessageCircle} label="Chat" badge={chatUnread} mobile />
              <NavItem to="/dealer/profile" icon={User} label="Profile" mobile />
            </>
          ) : (
            <>
              <NavItem to="/" icon={Home} label="Home" end mobile />
              <NavItem to="/search" icon={Search} label="Search" mobile />
              {user ? (
                <>
                  <NavItem to="/bookings" icon={CalendarClock} label="Bookings" mobile />
                  <NavItem to="/messages" icon={MessageCircle} label="Chat" badge={chatUnread} mobile />
                  <NavItem to="/dashboard" icon={LayoutDashboard} label="You" mobile />
                </>
              ) : (
                <>
                  <NavItem to="/dealers" icon={Store} label="Dealers" mobile />
                  <NavItem to="/login" icon={LogIn} label="Sign in" mobile />
                </>
              )}
            </>
          )}
        </div>
      </nav>
    </div>
  )
}

function MobileLink({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50',
        )
      }
    >
      {createElement(icon, { className: 'h-4 w-4 shrink-0' })}
      {label}
      <ChevronRight className="ml-auto h-4 w-4 text-slate-300 dark:text-slate-600" />
    </NavLink>
  )
}
