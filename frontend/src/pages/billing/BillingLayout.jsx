import { NavLink, Outlet } from 'react-router-dom'
import { FileText, CreditCard, Receipt, BarChart3 } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/billing/invoices', label: 'Hóa đơn', icon: FileText },
  { to: '/app/billing/rate-cards', label: 'Bảng giá', icon: CreditCard },
  { to: '/app/billing/events', label: 'Sự kiện thanh toán', icon: Receipt },
  { to: '/app/billing/dashboard', label: 'Bảng điều khiển', icon: BarChart3 },
]

export function BillingLayout() {
  return (
    <div className="page-section">
      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon"><CreditCard className="h-4 w-4" /></div>
          <h1 className="module-nav-title">Thanh toán</h1>
        </div>
        <nav className="module-nav-list">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => cn('module-nav-item', isActive ? 'module-nav-item-active' : '')}
            >
              <item.icon className="h-4 w-4" />{item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}
