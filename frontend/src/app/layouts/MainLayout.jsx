import { useEffect, useState, useCallback } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, Bell, ChevronDown, Menu, Search, X } from 'lucide-react'
import { AppSidebar } from './components/AppSidebar'
import { Button, Input, Switch } from '@shared/ui'
import { cn } from '@shared/lib/cn'
import { isMockApiEnabled, setMockApiEnabled } from '@mocks/utils'

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
          'min-h-screen transition-all duration-300',
          // Desktop: margin theo sidebar, Mobile: không margin
          isSidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-60'
        )}
      >
        <header className="sticky top-0 z-20 border-b border-moon-200 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {/* Mobile hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-moon-300 bg-white text-navy-600 transition-colors hover:bg-moon-50 lg:hidden"
                aria-label="Mở menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <Link to="/" className="hidden xl:block">
                <Button variant="outline" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
                  Trang chủ
                </Button>
              </Link>
              <div className="relative w-full max-w-md min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ice" />
                <Input
                  className="pl-10"
                  placeholder="Tìm kiếm..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="hidden md:block rounded-xl border border-moon-300 bg-white px-3 py-2 shadow-card">
                <Switch
                  checked={isMockEnabled}
                  onChange={handleToggleMock}
                  label="Dữ liệu mẫu"
                  description={isMockEnabled ? 'Đang dùng dữ liệu mẫu' : 'Đang dùng API thật'}
                  className="items-center"
                />
              </div>

              <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-moon-300 bg-white text-navy-600 transition-all duration-200 hover:border-ice/40 hover:text-ice-dark">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-ice" />
              </button>

              <button className="flex items-center gap-2 rounded-2xl border border-moon-300 bg-white px-2 py-1.5 shadow-card transition-all duration-200 hover:border-ice/40 hover:shadow-card-hover sm:gap-3 sm:px-3 sm:py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800 text-xs font-bold text-ice-light sm:h-10 sm:w-10 sm:rounded-xl sm:text-sm">
                  AD
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-navy-900">Admin TVL</p>
                  <p className="text-xs text-navy-400">Vận hành nền tảng</p>
                </div>
                <ChevronDown className="hidden sm:block h-4 w-4 text-navy-400" />
              </button>
            </div>
          </div>
        </header>

        <div className="app-main">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
