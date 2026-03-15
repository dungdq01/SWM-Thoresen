import { useEffect, useState, useCallback } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, Bell, ChevronDown, Menu } from 'lucide-react'
import { AppSidebar } from './components/AppSidebar'
import { Button, Switch } from '@shared/ui'
import { cn } from '@shared/lib/cn'
import { isMockApiEnabled, setMockApiEnabled } from '@mocks/utils'
import { GuidedTourProvider, TourOverlay, TourLauncher } from '@shared/guided-tour'
import '@shared/guided-tour/guided-tour.css'

export function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMockEnabled, setIsMockEnabledState] = useState(() => isMockApiEnabled())
  const location = useLocation()

  useEffect(() => {
    setIsMockEnabledState(isMockApiEnabled())
  }, [])

  // Auto-close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
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
      {/* Mobile backdrop */}
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
      
      <main
        className={cn(
          'flex flex-col flex-1 min-w-0 transition-all duration-300',
          isSidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-60'
        )}
      >
        <header className="flex-shrink-0 z-20 border-b border-moon-200 bg-background/95 backdrop-blur-sm">
          <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-6">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Mobile hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-moon-300 bg-white text-navy-600 transition-colors hover:bg-moon-50 lg:hidden"
                aria-label="Mở menu"
              >
                <Menu className="h-4 w-4" />
              </button>

              <Link to="/" className="hidden xl:block flex-shrink-0">
                <Button variant="outline" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
                  Trang chủ
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Mock toggle — desktop only */}
              <div className="hidden md:block rounded-xl border border-moon-300 bg-white px-3 py-1.5 shadow-card">
                <Switch
                  checked={isMockEnabled}
                  onChange={handleToggleMock}
                  label="Dữ liệu mẫu"
                  description={isMockEnabled ? 'Đang dùng dữ liệu mẫu' : 'Đang dùng API thật'}
                  className="items-center"
                />
              </div>

              <TourLauncher />

              {/* Bell */}
              <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-moon-300 bg-white text-navy-600 transition-all duration-200 hover:border-ice/40 hover:text-ice-dark">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-ice" />
              </button>

              {/* User avatar */}
              <button className="flex items-center gap-2 rounded-xl border border-moon-300 bg-white px-2 py-1.5 shadow-card transition-all duration-200 hover:border-ice/40 hover:shadow-card-hover">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-800 text-xs font-bold text-ice-light">
                  AD
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-navy-900 leading-tight">Admin TVL</p>
                  <p className="text-xs text-navy-400 leading-tight">Vận hành nền tảng</p>
                </div>
                <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-navy-400" />
              </button>
            </div>
          </div>
        </header>

        <div className="app-main">
          <Outlet />
        </div>
      </main>

      <TourOverlay />
    </div>
    </GuidedTourProvider>
  )
}
