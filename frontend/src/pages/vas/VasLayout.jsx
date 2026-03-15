import { NavLink, Outlet } from 'react-router-dom'
import { Box, ClipboardList, Play, BarChart3 } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/vas/work-orders', label: 'Lệnh công việc', icon: ClipboardList },
  { to: '/app/vas/execution', label: 'Thực hiện', icon: Play },
  { to: '/app/vas/dashboard', label: 'Bảng điều khiển', icon: BarChart3 },
]

export function VasLayout() {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">VAS / Đóng gói</h1>
        </div>
      </div>

      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon">
            <Box className="h-4 w-4" />
          </div>
          <div>
            <h2 className="module-nav-title">Dịch vụ gia tăng (VAS)</h2>
            <p className="module-nav-description">Quản lý đóng bao, đóng gói lại và các dịch vụ gia tăng.</p>
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
