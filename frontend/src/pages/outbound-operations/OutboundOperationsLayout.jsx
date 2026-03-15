import { NavLink, Outlet } from 'react-router-dom'
import { CheckSquare, ClipboardList, FileText, Package, Scale, Truck } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/outbound-operations/sales-orders', label: 'Đơn bán hàng', icon: FileText },
  { to: '/app/outbound-operations/shipments', label: 'Lô hàng xuất', icon: ClipboardList },
  { to: '/app/outbound-operations/allocation', label: 'Phân bổ', icon: Package },
  { to: '/app/outbound-operations/weighing', label: 'Cân hàng', icon: Scale },
  { to: '/app/outbound-operations/approvals', label: 'Phê duyệt', icon: CheckSquare },
]

export function OutboundOperationsLayout() {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vận hành xuất kho</h1>
        </div>
      </div>

      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="module-nav-title">Điều hướng xuất kho</h2>
            <p className="module-nav-description">Quản lý chuyến hàng từ tiếp nhận SO, phân bổ, cân nhiều lần đến xuất hàng và đóng lệnh.</p>
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
