import { NavLink, Outlet } from 'react-router-dom'
import { FileText, CreditCard, Receipt, BarChart3 } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/billing/invoices', label: 'Invoices', icon: FileText },
  { to: '/app/billing/rate-cards', label: 'Rate Cards', icon: CreditCard },
  { to: '/app/billing/events', label: 'Billable Events', icon: Receipt },
  { to: '/app/billing/dashboard', label: 'Dashboard', icon: BarChart3 },
]

export function BillingLayout() {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing</h1>
        </div>
      </div>

      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h2 className="module-nav-title">Billing & Invoicing</h2>
            <p className="module-nav-description">Manage rate cards, billable events, and generate invoices.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <nav className="module-nav-list">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'module-nav-item',
                    isActive
                      ? 'module-nav-item-active'
                      : ''
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <Outlet />
    </div>
  )
}
