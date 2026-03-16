import { useEffect, useState, useCallback } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, Bell, ChevronDown, Menu, Search, Sun, Moon } from 'lucide-react'
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

export function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMockEnabled, setIsMockEnabledState] = useState(() => isMockApiEnabled())
  const location = useLocation()
  const { open: openPalette } = useCommandPalette()
  const { isDark, toggle: toggleDark } = useDarkMode()
  const { showBottomNav } = usePlatform()

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
          <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-6">

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

              <Link to="/" className="hidden xl:block flex-shrink-0">
                <Button variant="outline" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
                  Trang chủ
                </Button>
              </Link>

              {/* Search trigger — Ctrl+K */}
              <button
                onClick={openPalette}
                className="hidden sm:flex items-center gap-2 h-9 rounded-xl border px-3 text-sm transition-colors hover:border-ice/40"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-subtle)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Search className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden md:inline">Tìm kiếm...</span>
                <kbd
                  className="hidden lg:inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px]"
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
                className="hidden md:block rounded-xl px-3 py-1.5"
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
              <button
                className="flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-all duration-200 hover:border-ice/40"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-800 text-xs font-bold text-ice-light">
                  AD
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>Admin TVL</p>
                  <p className="text-xs leading-tight" style={{ color: 'var(--color-text-muted)' }}>Vận hành nền tảng</p>
                </div>
                <ChevronDown className="hidden sm:block h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
              </button>
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
