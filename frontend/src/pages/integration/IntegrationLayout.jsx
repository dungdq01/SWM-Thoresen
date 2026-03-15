import { NavLink, Outlet } from 'react-router-dom'
import { Activity, AlertTriangle, Radio, Scale } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/integration/monitoring', label: 'Giám sát', icon: Activity },
  { to: '/app/integration/alerts', label: 'Cảnh báo', icon: AlertTriangle },
  { to: '/app/integration/weighbridge', label: 'Cân xe tải', icon: Scale },
  { to: '/app/integration/channels', label: 'Kênh kết nối', icon: Radio },
]

export function IntegrationLayout() {
  return (
    <div className="page-section">
      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon"><Radio className="h-4 w-4" /></div>
          <h1 className="module-nav-title">Trung tâm tích hợp</h1>
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
