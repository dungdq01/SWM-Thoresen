import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { 
  Box,
  Boxes,
  ClipboardCheck,
  ChevronDown, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  Waypoints,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@shared/lib/cn'

const menuConfig = [
  {
    id: 'center',
    groupLabel: 'Trung tâm',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        to: '/app',
        children: null,
      },
    ],
  },
  {
    id: 'master-data',
    groupLabel: 'Dữ liệu nền',
    items: [
      {
        id: 'master-data-root',
        label: 'Master Data',
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
    ],
  },
  {
    id: 'inventory-core',
    groupLabel: 'Inventory Truth',
    items: [
      {
        id: 'inventory-core-root',
        label: 'Inventory Core',
        icon: Boxes,
        basePath: '/app/inventory-core',
        children: [
          { to: '/app/inventory-core/on-hand', label: 'On-hand', icon: Boxes },
          { to: '/app/inventory-core/transactions', label: 'Transactions', icon: FileText },
          { to: '/app/inventory-core/holds', label: 'Holds', icon: Shield },
          { to: '/app/inventory-core/workbench', label: 'Workbench', icon: BookOpen },
        ],
      },
    ],
  },
  {
    id: 'inbound-operations',
    groupLabel: 'Inbound Flow',
    items: [
      {
        id: 'inbound-operations-root',
        label: 'Inbound Operations',
        icon: Truck,
        basePath: '/app/inbound-operations',
        children: [
          { to: '/app/inbound-operations/receipts', label: 'Receipts', icon: ClipboardCheck },
          { to: '/app/inbound-operations/execution', label: 'Execution', icon: Scale },
          { to: '/app/inbound-operations/exceptions', label: 'Exceptions', icon: AlertTriangle },
          { to: '/app/inbound-operations/putaway', label: 'Putaway', icon: Waypoints },
        ],
      },
    ],
  },
  {
    id: 'foundation',
    groupLabel: 'Foundation',
    items: [
      {
        id: 'settings-root',
        label: 'Foundation & Governance',
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
            'sidebar-item sidebar-item-hover',
            isActive && 'sidebar-item-active'
          )
        }
      >
        <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'sidebar-item sidebar-item-hover w-full',
          isActive && 'sidebar-item-active'
        )}
      >
        <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </>
        )}
      </button>

      {!isCollapsed && isExpanded && hasChildren && (
        <div className="mt-1 ml-4 space-y-1 border-l border-sidebar-border pl-4">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                cn(
                  'sidebar-item sidebar-item-hover py-2 text-xs',
                  isActive && 'sidebar-item-active'
                )
              }
            >
              <child.icon className="h-4 w-4 flex-shrink-0" />
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
        'fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-sidebar-border bg-gradient-to-b from-navy-900 to-navy-800 transition-all duration-300',
        isCollapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-navy-900 shadow-glow-gold">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-moon-50">SmartLog <span className="text-gold">SWM</span></h1>
              <p className="text-xs text-moon-100/60">TVL Warehouse Platform</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gold text-navy-900 shadow-glow-gold">
            <Box className="h-5 w-5" />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {menuConfig.map((group) => (
          <div key={group.id} className="space-y-2">
            {!isCollapsed && <p className="sidebar-group-title">{group.groupLabel}</p>}
            <div className="space-y-1">
              {group.items.map((item) => (
                <MenuItem key={item.id} item={item} isCollapsed={isCollapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={onToggle}
          className={cn(
            'sidebar-item sidebar-item-hover w-full justify-center text-moon-100/80',
            !isCollapsed && 'justify-between'
          )}
        >
          {!isCollapsed ? <span>Thu gọn</span> : null}
          {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
