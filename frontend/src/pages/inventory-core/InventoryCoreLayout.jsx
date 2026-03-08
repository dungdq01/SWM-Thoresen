import { NavLink, Outlet } from 'react-router-dom'
import { Boxes, Layers3, ScrollText, ShieldCheck, Workflow } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/inventory-core/on-hand', label: 'On-hand', icon: Layers3 },
  { to: '/app/inventory-core/transactions', label: 'Transactions', icon: ScrollText },
  { to: '/app/inventory-core/holds', label: 'Holds', icon: ShieldCheck },
  { to: '/app/inventory-core/workbench', label: 'Posting workbench', icon: Workflow },
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
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h2 className="module-nav-title">Điều hướng inventory truth</h2>
            <p className="module-nav-description">Theo dõi tồn hiện tại, transaction history, allocation hold và thao tác posting/reversal ngay trong cùng module.</p>
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
