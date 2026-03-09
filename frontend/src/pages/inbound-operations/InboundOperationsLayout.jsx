import { NavLink, Outlet } from 'react-router-dom'
import { AlertTriangle, ClipboardCheck, Scale, Truck, Waypoints } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/inbound-operations/receipts', label: 'Receipts', icon: ClipboardCheck },
  { to: '/app/inbound-operations/execution', label: 'Execution', icon: Scale },
  { to: '/app/inbound-operations/exceptions', label: 'Exceptions', icon: AlertTriangle },
  { to: '/app/inbound-operations/putaway', label: 'Putaway handoff', icon: Waypoints },
]

export function InboundOperationsLayout() {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inbound Operations</h1>
        </div>
      </div>

      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="module-nav-title">Operational Gatekeeper Navigation</h2>
            <p className="module-nav-description">Track planning receipts, weigh-in/weigh-out, tolerance failures, re-weigh, and closing rules in a unified flow.</p>
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
