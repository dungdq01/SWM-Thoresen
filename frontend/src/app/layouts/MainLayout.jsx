import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, ChevronDown, Menu, Search, Sun, Moon, LogOut } from 'lucide-react'
import { useAuth } from '@domains/auth'
import { AppSidebar } from './components/AppSidebar'
import { MobileBottomNav } from './components/MobileBottomNav'
import { Button, Switch } from '@shared/ui'
import { cn } from '@shared/lib/cn'
import { usePlatform } from '@shared/hooks/usePlatform'
import { isMockApiEnabled, setMockApiEnabled } from '@mocks/utils'
import { GuidedTourProvider, TourOverlay, TourLauncher } from '@shared/guided-tour'
import '@shared/guided-tour/guided-tour.css'
import { CommandPalette } from '@shared/command-search/CommandPalette'
import { useCommandPalette } from '@shared/command-search/useCommandPalette'
import { useDarkMode } from '@shared/hooks/useDarkMode'

// Shared style: header icon button
const HEADER_BTN = [
  'flex items-center justify-center rounded-xl transition-all duration-200',
  'border bg-[var(--color-bg-card)] text-[var(--color-text-secondary)]',
  'hover:border-ice/40 hover:text-ice-dark',
].join(' ')

const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  WH_MANAGER: 'Quản lý kho',
  WH_KEEPER: 'Thủ kho',
  WB_OPERATOR: 'Vận hành cân',
  OPS_SUPER: 'Giám sát vận hành',
  BILLING_OFC: 'Nhân viên billing',
  GOVERNANCE_MANAGER: 'Quản lý governance',
  CUST_VIEWER: 'Khách hàng',
}

export function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMockEnabled, setIsMockEnabledState] = useState(() => isMockApiEnabled())
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { open: openPalette } = useCommandPalette()
  const { isDark, toggle: toggleDark } = useDarkMode()
  const { showBottomNav } = usePlatform()

  const displayName = user?.fullName || user?.username || 'Người dùng'
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const primaryRole = user?.roleCodes?.[0]
  const roleLabel = primaryRole ? (ROLE_LABELS[primaryRole] || primaryRole) : ''

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setIsUserMenuOpen(false)
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    document.documentElement.style.setProperty('--bottom-nav-height', showBottomNav ? '56px' : '0px')
  }, [showBottomNav])

  useEffect(() => { setIsMockEnabledState(isMockApiEnabled()) }, [])

  useEffect(() => { setIsMobileMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileMenuOpen])

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), [])

  const handleToggleMock = (enabled) => {
    setMockApiEnabled(enabled)
    setIsMockEnabledState(enabled)
    window.location.reload()
  }

  return (
    <GuidedTourProvider>
    <div className="page-shell">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      <AppSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={closeMobileMenu}
      />

      <main className={cn('flex flex-col flex-1 min-w-0 transition-all duration-300', isSidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-60')}>
        {/* ── Header ── */}
        <header
          className="flex-shrink-0 z-20 backdrop-blur-sm safe-area-top"
          style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
        >
          <div className="flex h-14 items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-4 md:px-6">

            {/* Left: hamburger + home + search */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={cn(HEADER_BTN, 'h-9 w-9 flex-shrink-0 lg:hidden')}
                style={{ borderColor: 'var(--color-border)' }}
                aria-label="Mở menu"
              >
                <Menu className="h-4 w-4" />
              </button>

              <Link to="/" className="hidden lg:block flex-shrink-0">
                <Button variant="outline" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
                  <span className="hidden xl:inline">Trang chủ</span>
                </Button>
              </Link>

              {/* Search trigger — Ctrl+K */}
              <button
                onClick={openPalette}
                className="hidden sm:flex items-center gap-1.5 md:gap-2 h-9 rounded-xl border px-2 md:px-3 text-sm transition-colors hover:border-ice/40"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-subtle)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Search className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden md:inline text-xs lg:text-sm">Tìm kiếm...</span>
                <kbd
                  className="hidden xl:inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px]"
                  style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                >
                  Ctrl K
                </kbd>
              </button>
            </div>

            {/* Right: mock toggle + dark mode + tour + bell + avatar */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

              {/* Mock toggle */}
              <div
                className="hidden lg:block rounded-xl px-2 xl:px-3 py-1.5"
                style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
              >
                <Switch
                  checked={isMockEnabled}
                  onChange={handleToggleMock}
                  label="Dữ liệu mẫu"
                  description={isMockEnabled ? 'Đang dùng dữ liệu mẫu' : 'Đang dùng API thật'}
                  className="items-center"
                />
              </div>

              {/* Dark mode toggle */}
              <button
                onClick={toggleDark}
                className={cn(HEADER_BTN, 'h-9 w-9')}
                style={{ borderColor: 'var(--color-border)' }}
                aria-label={isDark ? 'Chuyển sang light mode' : 'Chuyển sang dark mode'}
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <TourLauncher />

              {/* Bell */}
              <button
                className={cn(HEADER_BTN, 'relative h-9 w-9')}
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-ice" />
              </button>

              {/* User avatar */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-all duration-200 hover:border-ice/40"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-800 text-xs font-bold text-ice-light">
                    {initials}
                  </div>
                  <div className="hidden md:block text-left max-w-[120px] xl:max-w-none">
                    <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--color-text)' }}>{displayName}</p>
                    <p className="text-xs leading-tight truncate" style={{ color: 'var(--color-text-muted)' }}>{roleLabel}</p>
                  </div>
                  <ChevronDown className="hidden md:block h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                </button>

                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-xl z-50 py-2"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
                  >
                    <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{displayName}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{user?.username}</p>
                      {roleLabel && <p className="text-xs mt-0.5 text-ice">{roleLabel}</p>}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors hover:bg-red-500/10 text-red-400"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="app-main">
          <Outlet />
        </div>
      </main>

      {showBottomNav && (
        <MobileBottomNav onOpenSidebar={() => setIsMobileMenuOpen(true)} />
      )}

      <TourOverlay />
      <CommandPalette />
    </div>
    </GuidedTourProvider>
  )
}
