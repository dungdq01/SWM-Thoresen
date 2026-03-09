import { NavLink, Outlet } from 'react-router-dom'
import { Clipboard, ClipboardCheck, ListTodo, Smartphone, Users } from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/app/work-execution/queue', label: 'Work Queue', icon: ListTodo },
  { to: '/app/work-execution/my-work', label: 'My Work', icon: Clipboard },
  { to: '/app/work-execution/execute', label: 'Execute', icon: ClipboardCheck },
  { to: '/app/work-execution/monitor', label: 'Monitor', icon: Users },
]

export function WorkExecutionLayout() {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h1 className="page-title">Work Execution</h1>
        </div>
      </div>

      <div className="module-nav-shell">
        <div className="module-nav-header">
          <div className="module-nav-icon">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="module-nav-title">Mobile & Task Execution</h2>
            <p className="module-nav-description">Claim, execute, and monitor warehouse tasks: Putaway, Pick, Move, Transfer.</p>
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
