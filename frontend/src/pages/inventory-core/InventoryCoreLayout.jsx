import { NavLink, Outlet } from 'react-router-dom'
import { Boxes, Camera, Layers3, ScrollText, ShieldCheck, ScanSearch, Workflow } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/inventory-core/on-hand', label: 'Tồn kho hiện tại', icon: Layers3 },
  { to: '/app/inventory-core/transactions', label: 'Giao dịch', icon: ScrollText },
  { to: '/app/inventory-core/holds', label: 'Giữ hàng', icon: ShieldCheck },
  { to: '/app/inventory-core/workbench', label: 'Bàn làm việc đăng sổ', icon: Workflow },
  { to: '/app/inventory-core/reconciliation', label: 'Đối soát', icon: ScanSearch },
  { to: '/app/inventory-core/snapshots', label: 'Snapshot & Billing', icon: Camera },
]

export function InventoryCoreLayout() {
  return (
    <div className="page-section">
      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon"><Boxes className="h-4 w-4" /></div>
          <h1 className="module-nav-title">Tồn kho lõi</h1>
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
