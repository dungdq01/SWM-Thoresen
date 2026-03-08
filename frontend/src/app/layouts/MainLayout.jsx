import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { ArrowLeft, Bell, ChevronDown, Search } from 'lucide-react'
import { AppSidebar } from './components/AppSidebar'
import { Button, Input, Switch } from '@shared/ui'
import { cn } from '@shared/lib/cn'
import { isMockApiEnabled, setMockApiEnabled } from '@mocks/utils'

export function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMockEnabled, setIsMockEnabledState] = useState(() => isMockApiEnabled())

  useEffect(() => {
    setIsMockEnabledState(isMockApiEnabled())
  }, [])

  const handleToggleMock = (enabled) => {
    setMockApiEnabled(enabled)
    setIsMockEnabledState(enabled)
    window.location.reload()
  }

  return (
    <div className="page-shell">
      <AppSidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
      
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          isSidebarCollapsed ? 'ml-[68px]' : 'ml-60'
        )}
      >
        <header className="sticky top-0 z-20 border-b border-moon-200 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex w-full max-w-xl items-center gap-3">
              <Link to="/" className="hidden xl:block">
                <Button variant="outline" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
                  Landing page
                </Button>
              </Link>
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
                <Input
                  className="pl-10"
                  placeholder="Tìm module, chứng từ hoặc vai trò..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-moon-300 bg-white px-3 py-2 shadow-card">
                <Switch
                  checked={isMockEnabled}
                  onChange={handleToggleMock}
                  label="Mock data"
                  description={isMockEnabled ? 'Đang dùng dữ liệu mẫu' : 'Đang dùng API thật'}
                  className="items-center"
                />
              </div>

              <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-moon-300 bg-white text-navy-600 transition-all duration-200 hover:border-gold/40 hover:text-gold-dark">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold" />
              </button>

              <button className="flex items-center gap-3 rounded-2xl border border-moon-300 bg-white px-3 py-2 shadow-card transition-all duration-200 hover:border-gold/40 hover:shadow-card-hover">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-sm font-bold text-gold">
                  AD
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-navy-900">Admin TVL</p>
                  <p className="text-xs text-navy-400">Foundation Operator</p>
                </div>
                <ChevronDown className="h-4 w-4 text-navy-400" />
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
