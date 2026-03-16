import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Menu,
} from 'lucide-react'
import { cn } from '@shared/lib/cn'

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Tổng quan',
    icon: LayoutDashboard,
    to: '/app',
    exact: true,
  },
  {
    id: 'inbound',
    label: 'Nhập kho',
    icon: ArrowDownToLine,
    to: '/app/inbound-operations',
  },
  {
    id: 'outbound',
    label: 'Xuất kho',
    icon: ArrowUpFromLine,
    to: '/app/outbound-operations',
  },
  {
    id: 'inventory',
    label: 'Tồn kho',
    icon: Package,
    to: '/app/inventory-core',
  },
  {
    id: 'more',
    label: 'Menu',
    icon: Menu,
    action: 'openSidebar',
  },
]

export function MobileBottomNav({ onOpenSidebar }) {
  const location = useLocation()

  return (
    <nav
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-all duration-200"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderTop: '1px solid var(--color-border)',
        paddingBottom: 'var(--sab)',
      }}
    >
      <div className="flex items-stretch justify-around h-14">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon

          if (item.action === 'openSidebar') {
            return (
              <button
                key={item.id}
                onClick={onOpenSidebar}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            )
          }

          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)

          return (
            <NavLink
              key={item.id}
              to={item.to}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-ice' : ''
              )}
              style={isActive ? undefined : { color: 'var(--color-text-muted)' }}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5', isActive && 'text-ice')} />
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-ice" />
                )}
              </div>
              <span className={cn(isActive && 'font-semibold')}>{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
