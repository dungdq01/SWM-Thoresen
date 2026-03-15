import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, Package, CreditCard, Shield, RefreshCw, CheckSquare } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/reporting/dashboard', label: 'Bảng điều khiển', icon: BarChart3 },
  { to: '/app/reporting/inventory', label: 'Báo cáo tồn kho', icon: Package },
  { to: '/app/reporting/billing', label: 'Báo cáo thanh toán', icon: CreditCard },
  { to: '/app/reporting/audit', label: 'Nhật ký kiểm tra', icon: Shield },
  { to: '/app/reporting/reconciliation', label: 'Đối soát', icon: RefreshCw },
  { to: '/app/reporting/go-live', label: 'Checklist Go-Live', icon: CheckSquare },
]

export function ReportingLayout() {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Báo cáo & Kiểm toán</h1>
        </div>
      </div>

      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="module-nav-title">Báo cáo, Kiểm toán & Go-Live</h2>
            <p className="module-nav-description">KPI dashboard, báo cáo tồn kho/thanh toán, nhật ký kiểm tra, đối soát và checklist go-live.</p>
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
