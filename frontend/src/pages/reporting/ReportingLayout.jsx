import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, Package, CreditCard, Shield, RefreshCw, CheckSquare } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/reporting/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/app/reporting/inventory', label: 'Inventory Report', icon: Package },
  { to: '/app/reporting/billing', label: 'Billing Report', icon: CreditCard },
  { to: '/app/reporting/audit', label: 'Audit Trail', icon: Shield },
  { to: '/app/reporting/reconciliation', label: 'Reconciliation', icon: RefreshCw },
  { to: '/app/reporting/go-live', label: 'Go-Live Checklist', icon: CheckSquare },
]

export function ReportingLayout() {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reporting & Audit</h1>
        </div>
      </div>

      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="module-nav-title">Reporting, Audit & Go-Live</h2>
            <p className="module-nav-description">KPI dashboard, báo cáo inventory/billing, audit trail, reconciliation, và go-live checklist.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <nav className="module-nav-list">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn('module-nav-item', isActive ? 'module-nav-item-active' : '')
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
