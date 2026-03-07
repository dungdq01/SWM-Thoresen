import { NavLink, Outlet } from 'react-router-dom'
import { 
  Users, Shield, Tag, Hash, BookOpen, FileText, 
  ChevronLeft, Settings 
} from 'lucide-react'
import { cn } from '@shared/lib/cn'

const navItems = [
  { to: '/settings/roles', icon: Users, label: 'Vai trò' },
  { to: '/settings/permissions', icon: Shield, label: 'Quyền' },
  { to: '/settings/reason-codes', icon: Tag, label: 'Mã lý do' },
  { to: '/settings/number-sequences', icon: Hash, label: 'Number Sequence' },
  { to: '/settings/governance', icon: BookOpen, label: 'Governance' },
  { to: '/settings/logs', icon: FileText, label: 'System Logs' },
]

export function SettingsAppLayout() {
  return (
    <div className="min-h-screen bg-navy-50/50 flex">
      <aside className="w-64 bg-white border-r border-navy-200 flex flex-col">
        <div className="p-4 border-b border-navy-100">
          <NavLink 
            to="/" 
            className="flex items-center gap-2 text-navy-600 hover:text-navy-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Về trang chủ</span>
          </NavLink>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-navy-900">Cài đặt</h2>
              <p className="text-xs text-navy-500">Module Foundation</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-50 text-primary-700 shadow-sm'
                      : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900'
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-navy-100">
          <div className="text-xs text-navy-500 text-center">
            SWM TVL v1.0.0
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
