import { NavLink, Outlet } from 'react-router-dom'
import { ArrowLeftRight, ClipboardCheck, FileText, Package, RefreshCcw, Scale, Settings2 } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/inventory-control/move-orders', label: 'Move Orders', icon: ArrowLeftRight },
  { to: '/app/inventory-control/transfers', label: 'Transfers', icon: Package },
  { to: '/app/inventory-control/status-change', label: 'Status Change', icon: RefreshCcw },
  { to: '/app/inventory-control/cycle-count', label: 'Cycle Count', icon: ClipboardCheck },
  { to: '/app/inventory-control/adjustments', label: 'Adjustments', icon: Scale },
  { to: '/app/inventory-control/history', label: 'Movement History', icon: FileText },
]

export function InventoryControlLayout() {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Control</h1>
        </div>
      </div>

      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="module-nav-title">Inventory Control Navigation</h2>
            <p className="module-nav-description">Move orders, transfers, status changes, cycle counts, and inventory adjustments.</p>
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
