import { NavLink, Outlet } from 'react-router-dom'
import { Clipboard, ClipboardCheck, ListTodo, Smartphone, Users } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/work-execution/queue', label: 'Hàng đợi công việc', icon: ListTodo },
  { to: '/app/work-execution/my-work', label: 'Công việc của tôi', icon: Clipboard },
  { to: '/app/work-execution/execute', label: 'Thực thi', icon: ClipboardCheck },
  { to: '/app/work-execution/monitor', label: 'Giám sát', icon: Users },
]

export function WorkExecutionLayout() {
  return (
    <div className="page-section">
      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon"><Smartphone className="h-4 w-4" /></div>
          <h1 className="module-nav-title">Thực thi công việc</h1>
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
