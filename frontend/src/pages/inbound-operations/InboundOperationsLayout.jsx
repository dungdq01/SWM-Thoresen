import { NavLink, Outlet } from 'react-router-dom'
import { AlertTriangle, ClipboardCheck, FileText, Scale, Truck, Waypoints } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/inbound-operations/purchase-orders', label: 'Đơn mua hàng', icon: FileText },
  { to: '/app/inbound-operations/receipts', label: 'Phiếu nhập', icon: ClipboardCheck },
  { to: '/app/inbound-operations/execution', label: 'Thực hiện', icon: Scale },
  { to: '/app/inbound-operations/exceptions', label: 'Ngoại lệ', icon: AlertTriangle },
  { to: '/app/inbound-operations/putaway', label: 'Bàn giao lưu kho', icon: Waypoints },
]

export function InboundOperationsLayout() {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý nhập hàng</h1>
        </div>
      </div>

      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="module-nav-title">Điều hướng quy trình nhập hàng</h2>
            <p className="module-nav-description">Theo dõi lập kế hoạch phiếu nhập, cân vào/cân ra, sai số dung sai, cân lại và quy tắc đóng trong một luồng thống nhất.</p>
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
