import { NavLink, Outlet } from 'react-router-dom'
import { ArrowLeftRight, ClipboardCheck, FileText, Package, RefreshCcw, Scale, Settings2 } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/inventory-control/move-orders', label: 'Lệnh di chuyển', icon: ArrowLeftRight },
  { to: '/app/inventory-control/transfers', label: 'Chuyển kho', icon: Package },
  { to: '/app/inventory-control/status-change', label: 'Đổi trạng thái', icon: RefreshCcw },
  { to: '/app/inventory-control/cycle-count', label: 'Kiểm kê', icon: ClipboardCheck },
  { to: '/app/inventory-control/adjustments', label: 'Điều chỉnh', icon: Scale },
  { to: '/app/inventory-control/history', label: 'Lịch sử di chuyển', icon: FileText },
]

export function InventoryControlLayout() {
  return (
    <div className="page-section">
      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon"><Settings2 className="h-4 w-4" /></div>
          <h1 className="module-nav-title">Kiểm soát kho</h1>
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
