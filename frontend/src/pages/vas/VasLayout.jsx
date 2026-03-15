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
      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon"><Box className="h-4 w-4" /></div>
          <h1 className="module-nav-title">VAS / Đóng gói</h1>
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
