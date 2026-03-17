import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Package, Menu } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/app', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { path: '/app/inbound', label: 'Nhập kho', icon: ArrowDownToLine },
  { path: '/app/outbound', label: 'Xuất kho', icon: ArrowUpFromLine },
  { path: '/app/inventory', label: 'Tồn kho', icon: Package },
]

export function MobileBottomNav({ onOpenSidebar }) {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path
    return location.pathname.startsWith(item.path)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-end justify-around border-t lg:hidden"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item)
        const Icon = item.icon
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 pt-2 pb-1 transition-colors"
            style={{ color: active ? 'var(--color-ice, #60a5fa)' : 'var(--color-text-muted)' }}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
            <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>
              {item.label}
            </span>
          </button>
        )
      })}

      {/* Menu button */}
      <button
        onClick={onOpenSidebar}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 pt-2 pb-1 transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <Menu className="h-5 w-5" strokeWidth={1.8} />
        <span className="text-[10px] font-medium">Menu</span>
      </button>
    </nav>
  )
}
