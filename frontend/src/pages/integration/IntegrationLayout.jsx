import { NavLink, Outlet } from 'react-router-dom'
import { Activity, AlertTriangle, Radio, Scale } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/integration/monitoring', label: 'Monitoring', icon: Activity },
  { to: '/app/integration/alerts', label: 'Alerts', icon: AlertTriangle },
  { to: '/app/integration/weighbridge', label: 'Weighbridge', icon: Scale },
  { to: '/app/integration/channels', label: 'Channels', icon: Radio },
]

export function IntegrationLayout() {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Integration Hub</h1>
        </div>
      </div>

      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h2 className="module-nav-title">System Integration</h2>
            <p className="module-nav-description">Monitor weighbridge, ERP sync, mobile sync, and OCR integration.</p>
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
