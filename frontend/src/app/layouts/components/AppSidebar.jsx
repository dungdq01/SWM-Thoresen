import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { 
  Box,
  Boxes,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  ChevronDown, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LayoutGrid,
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
  TruckIcon,
  Tags,
  Waypoints,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  X,
} from 'lucide-react'
import { cn } from '@shared/lib/cn'
import { useLanguage } from '@shared/i18n'
import { LanguageSwitcher } from '@shared/ui'

const getMenuConfig = (t) => [
  {
    id: 'center',
    groupLabel: t('sidebar.groups.center'),
    items: [
      {
        id: 'dashboard',
        label: t('sidebar.items.dashboard'),
        icon: LayoutDashboard,
        to: '/app',
        children: null,
      },
    ],
  },
  {
    id: 'master-data',
    groupLabel: t('sidebar.groups.masterData'),
    items: [
      {
        id: 'master-data-root',
        label: t('sidebar.items.masterData'),
        icon: Database,
        basePath: '/app/master-data',
        children: [
          { to: '/app/master-data/owners', label: t('sidebar.items.owners'), icon: Building2 },
          { to: '/app/master-data/vendors', label: t('sidebar.items.vendors'), icon: Ship },
          { to: '/app/master-data/items', label: t('sidebar.items.items'), icon: Package },
          { to: '/app/master-data/warehouses', label: t('sidebar.items.warehouses'), icon: WarehouseIcon },
          { to: '/app/master-data/zones', label: t('sidebar.items.zones'), icon: Grid3X3 },
          { to: '/app/master-data/locations', label: t('sidebar.items.locations'), icon: MapPin },
          { to: '/app/master-data/uoms', label: t('sidebar.items.uoms'), icon: Scale },
          { to: '/app/master-data/vehicle-types', label: t('sidebar.items.vehicleTypes'), icon: Truck },
          { to: '/app/master-data/inventory-statuses', label: t('sidebar.items.inventoryStatuses'), icon: Tags },
        ],
      },
    ],
  },
  {
    id: 'inventory-core',
    groupLabel: t('sidebar.groups.inventoryTruth'),
    items: [
      {
        id: 'inventory-core-root',
        label: t('sidebar.items.inventoryCore'),
        icon: Boxes,
        basePath: '/app/inventory-core',
        children: [
          { to: '/app/inventory-core/on-hand', label: t('sidebar.items.onHand'), icon: Boxes },
          { to: '/app/inventory-core/transactions', label: t('sidebar.items.transactions'), icon: FileText },
          { to: '/app/inventory-core/holds', label: t('sidebar.items.holds'), icon: Shield },
          { to: '/app/inventory-core/workbench', label: t('sidebar.items.workbench'), icon: BookOpen },
        ],
      },
    ],
  },
  {
    id: 'inbound-operations',
    groupLabel: t('sidebar.groups.inboundFlow'),
    items: [
      {
        id: 'inbound-operations-root',
        label: t('sidebar.items.inboundOperations'),
        icon: Truck,
        basePath: '/app/inbound-operations',
        children: [
          { to: '/app/inbound-operations/receipts', label: t('sidebar.items.receipts'), icon: ClipboardCheck },
          { to: '/app/inbound-operations/execution', label: t('sidebar.items.execution'), icon: Scale },
          { to: '/app/inbound-operations/exceptions', label: t('sidebar.items.exceptions'), icon: AlertTriangle },
          { to: '/app/inbound-operations/putaway', label: t('sidebar.items.putaway'), icon: Waypoints },
        ],
      },
    ],
  },
  {
    id: 'outbound-operations',
    groupLabel: t('sidebar.groups.outboundFlow'),
    items: [
      {
        id: 'outbound-operations-root',
        label: t('sidebar.items.outboundOperations'),
        icon: TruckIcon,
        basePath: '/app/outbound-operations',
        children: [
          { to: '/app/outbound-operations/shipments', label: t('sidebar.items.shipments'), icon: ClipboardList },
          { to: '/app/outbound-operations/allocation', label: t('sidebar.items.allocation'), icon: Package },
          { to: '/app/outbound-operations/weighing', label: t('sidebar.items.weighing'), icon: Scale },
          { to: '/app/outbound-operations/approvals', label: t('sidebar.items.approvals'), icon: CheckSquare },
        ],
      },
    ],
  },
  {
    id: 'inventory-control',
    groupLabel: t('sidebar.groups.inventoryControl'),
    items: [
      {
        id: 'inventory-control-root',
        label: t('sidebar.items.inventoryControlMenu'),
        icon: Settings,
        basePath: '/app/inventory-control',
        children: [
          { to: '/app/inventory-control/move-orders', label: t('sidebar.items.moveOrders'), icon: Waypoints },
          { to: '/app/inventory-control/transfers', label: t('sidebar.items.transfers'), icon: Package },
          { to: '/app/inventory-control/status-change', label: t('sidebar.items.statusChange'), icon: Tag },
          { to: '/app/inventory-control/cycle-count', label: t('sidebar.items.cycleCount'), icon: ClipboardCheck },
          { to: '/app/inventory-control/adjustments', label: t('sidebar.items.adjustments'), icon: Scale },
          { to: '/app/inventory-control/history', label: t('sidebar.items.history'), icon: FileText },
        ],
      },
    ],
  },
  {
    id: 'work-execution',
    groupLabel: t('sidebar.groups.workExecution'),
    items: [
      {
        id: 'work-execution-root',
        label: t('sidebar.items.workExecutionMenu'),
        icon: ClipboardList,
        basePath: '/app/work-execution',
        children: [
          { to: '/app/work-execution/queue', label: t('sidebar.items.workQueue'), icon: ClipboardCheck },
          { to: '/app/work-execution/my-work', label: t('sidebar.items.myWork'), icon: FileText },
          { to: '/app/work-execution/execute', label: t('sidebar.items.execute'), icon: CheckSquare },
          { to: '/app/work-execution/monitor', label: t('sidebar.items.monitor'), icon: Users },
        ],
      },
    ],
  },
  {
    id: 'integration',
    groupLabel: t('sidebar.groups.integration'),
    items: [
      {
        id: 'integration-root',
        label: t('sidebar.items.integrationHub'),
        icon: Waypoints,
        basePath: '/app/integration',
        children: [
          { to: '/app/integration/monitoring', label: t('sidebar.items.monitoring'), icon: Shield },
          { to: '/app/integration/alerts', label: t('sidebar.items.alerts'), icon: AlertTriangle },
          { to: '/app/integration/weighbridge', label: t('sidebar.items.weighbridge'), icon: Scale },
          { to: '/app/integration/channels', label: t('sidebar.items.channels'), icon: Waypoints },
        ],
      },
    ],
  },
  {
    id: 'vas',
    groupLabel: t('sidebar.groups.vasBagging'),
    items: [
      {
        id: 'vas-root',
        label: t('sidebar.items.vasOperations'),
        icon: Package,
        basePath: '/app/vas',
        children: [
          { to: '/app/vas/work-orders', label: t('sidebar.items.workOrders'), icon: ClipboardList },
          { to: '/app/vas/execution', label: t('sidebar.items.execution'), icon: CheckSquare },
          { to: '/app/vas/dashboard', label: t('sidebar.items.dashboard'), icon: LayoutGrid },
        ],
      },
    ],
  },
  {
    id: 'billing',
    groupLabel: t('sidebar.groups.billing'),
    items: [
      {
        id: 'billing-root',
        label: t('sidebar.items.billingInvoices'),
        icon: FileText,
        basePath: '/app/billing',
        children: [
          { to: '/app/billing/invoices', label: t('sidebar.items.invoices'), icon: FileText },
          { to: '/app/billing/rate-cards', label: t('sidebar.items.rateCards'), icon: Tag },
          { to: '/app/billing/events', label: t('sidebar.items.billableEvents'), icon: ClipboardCheck },
          { to: '/app/billing/dashboard', label: t('sidebar.items.dashboard'), icon: LayoutGrid },
        ],
      },
    ],
  },
  {
    id: 'reporting',
    groupLabel: t('sidebar.groups.reporting'),
    items: [
      {
        id: 'reporting-root',
        label: t('sidebar.items.reportingMenu'),
        icon: BarChart3,
        basePath: '/app/reporting',
        children: [
          { to: '/app/reporting/dashboard', label: t('sidebar.items.reportingDashboard'), icon: LayoutGrid },
          { to: '/app/reporting/inventory', label: t('sidebar.items.inventoryReport'), icon: Boxes },
          { to: '/app/reporting/billing', label: t('sidebar.items.billingReport'), icon: FileText },
          { to: '/app/reporting/audit', label: t('sidebar.items.auditTrail'), icon: Shield },
          { to: '/app/reporting/reconciliation', label: t('sidebar.items.reconciliation'), icon: RefreshCw },
          { to: '/app/reporting/go-live', label: t('sidebar.items.goLiveChecklist'), icon: CheckSquare },
        ],
      },
    ],
  },
  {
    id: 'foundation',
    groupLabel: t('sidebar.groups.foundation'),
    items: [
      {
        id: 'settings-root',
        label: t('sidebar.items.foundationGovernance'),
        icon: Settings,
        basePath: '/app/settings',
        children: [
          { to: '/app/settings/roles', label: t('sidebar.items.roles'), icon: Users },
          { to: '/app/settings/permissions', label: t('sidebar.items.permissions'), icon: Shield },
          { to: '/app/settings/reason-codes', label: t('sidebar.items.reasonCodes'), icon: Tag },
          { to: '/app/settings/number-sequences', label: t('sidebar.items.numberSequence'), icon: Hash },
          { to: '/app/settings/governance', label: t('sidebar.items.governance'), icon: BookOpen },
          { to: '/app/settings/logs', label: t('sidebar.items.systemLogs'), icon: FileText },
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

export function AppSidebar({ isCollapsed, onToggle, isMobileOpen, onMobileClose }) {
  const { t } = useLanguage()
  const menuConfig = getMenuConfig(t)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-gradient-to-b from-navy-900 to-navy-800 transition-all duration-300',
        // Mobile: drawer overlay, ẩn mặc định
        isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
        // Desktop: collapse theo state
        isCollapsed ? 'lg:w-[68px]' : 'lg:w-60',
        // Mobile: luôn w-72 khi mở
        'w-72 lg:w-auto'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <div className="flex items-center gap-3">
          {(!isCollapsed || isMobileOpen) && (
            <>
              <img 
                src="/assets/logo.png" 
                alt="SmartLog" 
                className="h-9 w-auto brightness-0 invert"
              />
              <div>
                <h1 className="text-sm font-bold text-moon-50">SmartLog <span className="text-ice-light">SWM</span></h1>
                <p className="text-xs text-moon-100/60">TVL Warehouse Platform</p>
              </div>
            </>
          )}
          {isCollapsed && !isMobileOpen && (
            <img 
              src="/assets/logo.png" 
              alt="SmartLog" 
              className="mx-auto h-8 w-auto brightness-0 invert"
            />
          )}
        </div>
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-moon-100/60 transition-colors hover:bg-sidebar-hover hover:text-moon-50 lg:hidden"
          aria-label="Đóng menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5 overscroll-contain">
        {menuConfig.map((group) => (
          <div key={group.id} className="space-y-2">
            {(!isCollapsed || isMobileOpen) && <p className="sidebar-group-title">{group.groupLabel}</p>}
            <div className="space-y-1">
              {group.items.map((item) => (
                <MenuItem key={item.id} item={item} isCollapsed={isCollapsed && !isMobileOpen} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        {(!isCollapsed || isMobileOpen) && <LanguageSwitcher variant="sidebar" />}
        <button
          onClick={onToggle}
          className={cn(
            'sidebar-item sidebar-item-hover w-full justify-center text-moon-100/80 hidden lg:flex',
            !isCollapsed && 'justify-between'
          )}
        >
          {!isCollapsed ? <span>{t('sidebar.collapse')}</span> : null}
          {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
