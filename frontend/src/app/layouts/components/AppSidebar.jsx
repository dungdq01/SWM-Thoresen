import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { 
  ChevronDown, 
  ChevronRight,
  LayoutDashboard,
  Settings,
  Database,
  Users, 
  Shield, 
  Tag, 
  Hash, 
  BookOpen, 
  FileText,
  Building2, 
  Ship, 
  Package, 
  Warehouse as WarehouseIcon, 
  MapPin, 
  Grid3X3, 
  Scale, 
  Truck, 
  Tags,
  Menu,
  X
} from 'lucide-react'
import { cn } from '@shared/lib/cn'

const menuConfig = [
  {
    id: 'dashboard',
    label: 'Tổng quan',
    icon: LayoutDashboard,
    to: '/app',
    children: null,
  },
  {
    id: 'master-data',
    label: 'Dữ liệu chủ',
    icon: Database,
    basePath: '/app/master-data',
    children: [
      { to: '/app/master-data/owners', label: 'Chủ hàng', icon: Building2 },
      { to: '/app/master-data/vendors', label: 'Nhà cung cấp', icon: Ship },
      { to: '/app/master-data/items', label: 'Mặt hàng', icon: Package },
      { to: '/app/master-data/warehouses', label: 'Kho', icon: WarehouseIcon },
      { to: '/app/master-data/zones', label: 'Zone', icon: Grid3X3 },
      { to: '/app/master-data/locations', label: 'Vị trí', icon: MapPin },
      { to: '/app/master-data/uoms', label: 'Đơn vị tính', icon: Scale },
      { to: '/app/master-data/vehicle-types', label: 'Loại phương tiện', icon: Truck },
      { to: '/app/master-data/inventory-statuses', label: 'Trạng thái tồn kho', icon: Tags },
    ],
  },
  {
    id: 'settings',
    label: 'Cài đặt',
    icon: Settings,
    basePath: '/app/settings',
    children: [
      { to: '/app/settings/roles', label: 'Vai trò', icon: Users },
      { to: '/app/settings/permissions', label: 'Quyền', icon: Shield },
      { to: '/app/settings/reason-codes', label: 'Mã lý do', icon: Tag },
      { to: '/app/settings/number-sequences', label: 'Number Sequence', icon: Hash },
      { to: '/app/settings/governance', label: 'Governance', icon: BookOpen },
      { to: '/app/settings/logs', label: 'System Logs', icon: FileText },
    ],
  },
]

function MenuItem({ item, isCollapsed }) {
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(() => {
    if (item.basePath) {
      return location.pathname.startsWith(item.basePath)
    }
    return false
  })

  const hasChildren = item.children && item.children.length > 0
  const isActive = item.to 
    ? location.pathname === item.to 
    : item.basePath 
      ? location.pathname.startsWith(item.basePath)
      : false

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  if (!hasChildren) {
    return (
      <NavLink
        to={item.to}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
            isActive
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
          )
        }
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-slate-700/50 text-slate-200'
            : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </>
        )}
      </button>

      {!isCollapsed && isExpanded && hasChildren && (
        <div className="mt-1 ml-4 pl-4 border-l border-slate-700 space-y-1">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                )
              }
            >
              <child.icon className="w-4 h-4 flex-shrink-0" />
              <span>{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function AppSidebar({ isCollapsed, onToggle }) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-slate-800 border-r border-slate-700 flex flex-col z-30 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-700">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
              <WarehouseIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm">KHO THÔNG MINH</h1>
              <p className="text-xs text-slate-400">Hệ thống quản lý kho hàng</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center mx-auto">
            <WarehouseIcon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <Menu className="w-3 h-3" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuConfig.map((item) => (
          <MenuItem key={item.id} item={item} isCollapsed={isCollapsed} />
        ))}
      </nav>

      {/* Footer - User Info */}
      <div className="p-4 border-t border-slate-700">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-sm">
              NV
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Nguyễn Văn A</p>
              <p className="text-xs text-slate-400 truncate">Quản trị viên</p>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-semibold text-sm mx-auto">
            NV
          </div>
        )}
      </div>
    </aside>
  )
}
