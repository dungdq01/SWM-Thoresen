import { NavLink, Outlet } from 'react-router-dom'
import { Boxes, Camera, Layers3, ScrollText, ShieldCheck, ScanSearch, Workflow } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/inventory-core/on-hand', label: 'On-hand', icon: Layers3 },
  { to: '/app/inventory-core/transactions', label: 'Transactions', icon: ScrollText },
  { to: '/app/inventory-core/holds', label: 'Holds', icon: ShieldCheck },
  { to: '/app/inventory-core/workbench', label: 'Posting workbench', icon: Workflow },
  { to: '/app/inventory-core/reconciliation', label: 'Đối soát', icon: ScanSearch },
  { to: '/app/inventory-core/snapshots', label: 'Snapshot & Billing', icon: Camera },
]

export function InventoryCoreLayout() {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Core Engine</h1>
        </div>
      </div>

      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon">
            <Boxes className="h-4 w-4" />
          </div>
          <div>
            <h2 className="module-nav-title">Inventory Truth Navigation</h2>
            <p className="module-nav-description">Track current stock, transaction history, allocation holds, and posting/reversal operations within the same module.</p>
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
