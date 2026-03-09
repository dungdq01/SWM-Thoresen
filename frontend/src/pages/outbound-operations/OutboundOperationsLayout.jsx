import { NavLink, Outlet } from 'react-router-dom'
import { CheckSquare, ClipboardList, Package, Scale, Truck } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/outbound-operations/shipments', label: 'Shipments', icon: ClipboardList },
  { to: '/app/outbound-operations/allocation', label: 'Allocation', icon: Package },
  { to: '/app/outbound-operations/weighing', label: 'Weighing', icon: Scale },
  { to: '/app/outbound-operations/approvals', label: 'Approvals', icon: CheckSquare },
]

export function OutboundOperationsLayout() {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Outbound Operations</h1>
        </div>
      </div>

      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="module-nav-title">Outbound Gatekeeper Navigation</h2>
            <p className="module-nav-description">Manage shipments from SO intake, allocation, multi-trip weighing to shipped and closing.</p>
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
