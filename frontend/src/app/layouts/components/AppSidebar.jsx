import { useState, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { 
  Boxes,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Settings,
  Database,
  FileText,
  Package, 
  Truck, 
  TruckIcon,
  ArrowRightLeft,
  Waypoints,
  BarChart3,
  ClipboardList,
  X,
  ScanEye,
  Scale,
  Split,
} from 'lucide-react'
import { cn } from '@shared/lib/cn'
import { useLanguage } from '@shared/i18n'
import { LanguageSwitcher } from '@shared/ui'

const getMenuConfig = (t) => [
  {
    id: 'dashboard',
    label: t('sidebar.items.dashboard'),
    icon: LayoutDashboard,
    to: '/app',
  },
  {
    id: 'warehouse-monitoring',
    label: 'Giám sát kho',
    icon: ScanEye,
    to: '/app/warehouse-monitoring',
  },
  { _divider: true, label: t('sidebar.sections.data') },
  {
    id: 'master-data',
    label: t('sidebar.items.masterData'),
    icon: Database,
    basePath: '/app/master-data',
    children: [
      { _groupLabel: 'Đối tác' },
      { to: '/app/master-data/owners', label: t('sidebar.items.owners') },
      { to: '/app/master-data/vendors', label: t('sidebar.items.vendors') },
      { to: '/app/master-data/customers', label: t('sidebar.items.customers') },
      { to: '/app/master-data/carriers', label: 'Nhà vận chuyển' },
      { to: '/app/master-data/vessels', label: 'Tên tàu' },
      { _groupLabel: 'Hàng hóa' },
      { to: '/app/master-data/item-groups', label: 'Nhóm hàng hóa' },
      { to: '/app/master-data/items', label: t('sidebar.items.items') },
      { to: '/app/master-data/lots', label: 'Lô hàng' },
      { to: '/app/master-data/owner-sku-mappings', label: 'Mapping Owner-SKU' },
      { to: '/app/master-data/item-incompatibilities', label: 'Không tương thích' },
      { _groupLabel: 'Thiết lập kho' },
      { to: '/app/master-data/warehouses', label: 'Kho hàng' },
      { to: '/app/master-data/zones', label: 'Khu vực' },
      { to: '/app/master-data/locations', label: t('sidebar.items.locations') },
      { to: '/app/master-data/location-types', label: 'Loại vị trí' },
      { to: '/app/master-data/owner-warehouse-access', label: 'Phân kho Owner' },
      { _groupLabel: 'Cấu hình hệ thống' },
      { to: '/app/master-data/uoms', label: t('sidebar.items.uoms') },
      { to: '/app/master-data/uom-conversions', label: t('sidebar.items.uomConversions') },
      { to: '/app/master-data/inventory-statuses', label: t('sidebar.items.inventoryStatuses') },
      { to: '/app/master-data/vehicle-types', label: 'Loại phương tiện' },
      { to: '/app/master-data/reason-codes', label: t('sidebar.items.reasonCodes') },
    ],
  },
  {
    id: 'inventory-core',
    label: t('sidebar.items.inventoryCore'),
    icon: Boxes,
    basePath: '/app/inventory-core',
    children: [
      { to: '/app/inventory-core/on-hand', label: t('sidebar.items.onHand') },
      { to: '/app/inventory-core/transactions', label: t('sidebar.items.transactions') },
      { to: '/app/inventory-core/holds', label: t('sidebar.items.holds') },
      { to: '/app/inventory-core/workbench', label: t('sidebar.items.workbench') },
      { to: '/app/inventory-core/reconciliation', label: t('sidebar.items.reconciliation') },
      { to: '/app/inventory-core/snapshots', label: t('sidebar.items.snapshots') },
    ],
  },
  { _divider: true, label: t('sidebar.sections.operations') },
  {
    id: 'inbound',
    label: t('sidebar.items.inboundOperations'),
    icon: Truck,
    basePath: '/app/inbound-operations',
    children: [
      { to: '/app/inbound-operations/purchase-orders', label: t('sidebar.items.purchaseOrders') },
      { to: '/app/inbound-operations/receipts', label: t('sidebar.items.receipts') },
      { to: '/app/inbound-operations/unloading', label: 'Dỡ hàng' },
      { to: '/app/inbound-operations/documents', label: 'Chứng từ nhập' },
    ],
  },
  {
    id: 'outbound',
    label: t('sidebar.items.outboundOperations'),
    icon: TruckIcon,
    basePath: '/app/outbound-operations',
    children: [
      { to: '/app/outbound-operations/sales-orders', label: 'Đơn bán hàng' },
      { to: '/app/outbound-operations/shipments', label: 'Phiếu xuất kho' },
      { to: '/app/outbound-operations/loading', label: 'Xếp hàng' },
      { to: '/app/outbound-operations/documents', label: 'Chứng từ xuất' },
    ],
  },
  {
    id: 'goods-split',
    label: 'Chia hàng đổi chủ',
    icon: Split,
    to: '/app/goods-split',
  },
  {
    id: 'inventory-control',
    label: t('sidebar.items.inventoryControlMenu'),
    icon: ArrowRightLeft,
    basePath: '/app/inventory-control',
    children: [
      { to: '/app/inventory-control/move-orders', label: t('sidebar.items.moveOrders') },
      { to: '/app/inventory-control/transfers', label: t('sidebar.items.transfers') },
      { to: '/app/inventory-control/status-change', label: t('sidebar.items.statusChange') },
      { to: '/app/inventory-control/cycle-count', label: t('sidebar.items.cycleCount') },
      { to: '/app/inventory-control/adjustments', label: t('sidebar.items.adjustments') },
      { to: '/app/inventory-control/history', label: t('sidebar.items.history') },
    ],
  },
  { _divider: true, label: t('sidebar.sections.services') },
  {
    id: 'vas',
    label: t('sidebar.items.vasOperations'),
    icon: Package,
    basePath: '/app/vas',
    children: [
      { to: '/app/vas/work-orders', label: t('sidebar.items.workOrders') },
      { to: '/app/vas/execution', label: t('sidebar.items.vasExecution') },
      { to: '/app/vas/dashboard', label: t('sidebar.items.vasDashboard') },
    ],
  },
  {
    id: 'billing',
    label: t('sidebar.items.billingInvoices'),
    icon: FileText,
    basePath: '/app/billing',
    children: [
      { to: '/app/billing/invoices', label: t('sidebar.items.invoices') },
      { to: '/app/billing/rate-cards', label: t('sidebar.items.rateCards') },
      { to: '/app/billing/events', label: t('sidebar.items.billableEvents') },
      { to: '/app/billing/dashboard', label: t('sidebar.items.billingDashboard') },
    ],
  },
  { _divider: true, label: t('sidebar.sections.system') },
  {
    id: 'reporting',
    label: t('sidebar.items.reportingMenu'),
    icon: BarChart3,
    basePath: '/app/reporting',
    children: [
      { to: '/app/reporting/dashboard', label: t('sidebar.items.reportingDashboard') },
      { to: '/app/reporting/inventory', label: t('sidebar.items.inventoryReport') },
      { to: '/app/reporting/billing', label: t('sidebar.items.billingReport') },
      { to: '/app/reporting/audit', label: t('sidebar.items.auditTrail') },
      { to: '/app/reporting/reconciliation', label: t('sidebar.items.reconciliation') },
      { to: '/app/reporting/go-live', label: t('sidebar.items.goLiveChecklist') },
    ],
  },
  {
    id: 'weighbridge',
    label: t('sidebar.items.weighbridge'),
    icon: Scale,
    to: '/app/weighbridge',
  },
  {
    id: 'ocr',
    label: t('sidebar.items.ocrScanner'),
    icon: ScanEye,
    to: '/app/ocr',
  },
  {
    id: 'integration',
    label: t('sidebar.items.integrationHub'),
    icon: Waypoints,
    basePath: '/app/integration',
    children: [
      { to: '/app/integration/monitoring', label: t('sidebar.items.monitoring') },
      { to: '/app/integration/alerts', label: t('sidebar.items.alerts') },
      { to: '/app/integration/channels', label: t('sidebar.items.channels') },
    ],
  },
  {
    id: 'foundation',
    label: t('sidebar.items.foundationGovernance'),
    icon: Settings,
    basePath: '/app/settings',
    children: [
      { to: '/app/settings/users', label: 'Tài khoản' },
      { to: '/app/settings/roles', label: t('sidebar.items.roles') },
      { to: '/app/settings/permissions', label: t('sidebar.items.permissions') },
      { to: '/app/settings/number-sequences', label: t('sidebar.items.numberSequence') },
      { to: '/app/settings/governance', label: t('sidebar.items.governance') },
      { to: '/app/settings/logs', label: t('sidebar.items.systemLogs') },
    ],
  },
]

function ChildrenWithGroups({ items }) {
  const location = useLocation()

  // Split items into groups: [ { label, items } ]
  const groups = []
  let current = { label: null, items: [] }
  for (const child of items) {
    if (child._groupLabel) {
      if (current.items.length > 0 || current.label) groups.push(current)
      current = { label: child._groupLabel, items: [] }
    } else {
      current.items.push(child)
    }
  }
  if (current.items.length > 0 || current.label) groups.push(current)

  // Auto-expand the group that contains the active route
  const activeGroupIdx = groups.findIndex(g =>
    g.items.some(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'))
  )

  const [expandedGroups, setExpandedGroups] = useState(() => {
    // Start with all expanded
    const set = new Set(groups.map((_, i) => i))
    return set
  })

  const toggleGroup = useCallback((idx) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  return (
    <div className="mt-0.5 ml-[15px] border-l border-sidebar-border/30 pl-4 pb-0.5">
      {groups.map((group, gIdx) => {
        const isOpen = expandedGroups.has(gIdx)
        return (
          <div key={group.label || gIdx}>
            {group.label && (
              <button
                onClick={() => toggleGroup(gIdx)}
                className="flex w-full items-center gap-1 px-2 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-moon-100/30 hover:text-moon-100/50 transition-colors"
              >
                <ChevronRight className={cn('h-3 w-3 transition-transform duration-150', isOpen && 'rotate-90')} />
                <span>{group.label}</span>
              </button>
            )}
            {(isOpen || !group.label) && group.items.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) =>
                  cn('sidebar-child-item', isActive && 'sidebar-child-active')
                }
              >
                <span>{child.label}</span>
              </NavLink>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function MenuItem({ item, isCollapsed, isExpanded, onToggle }) {
  const location = useLocation()

  const hasChildren = item.children && item.children.length > 0
  const isActive = item.to 
    ? location.pathname === item.to 
    : item.basePath 
      ? location.pathname.startsWith(item.basePath)
      : false

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
        onClick={onToggle}
        className={cn(
          'sidebar-item sidebar-item-hover w-full',
          isActive && !isExpanded && 'sidebar-item-active',
          isExpanded && 'text-moon-50'
        )}
      >
        <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-moon-100/40 transition-transform duration-200',
                !isExpanded && '-rotate-90'
              )}
            />
          </>
        )}
      </button>

      {!isCollapsed && (
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-200 ease-out',
            isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          <div className="overflow-hidden">
            <ChildrenWithGroups items={item.children} />
          </div>
        </div>
      )}
    </div>
  )
}

export function AppSidebar({ isCollapsed, onToggle, isMobileOpen, onMobileClose }) {
  const { t } = useLanguage()
  const location = useLocation()
  const menuConfig = getMenuConfig(t)

  const [expandedId, setExpandedId] = useState(() => {
    const activeItem = menuConfig.find(item =>
      item.basePath && location.pathname.startsWith(item.basePath)
    )
    return activeItem?.id || null
  })

  const handleToggle = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  const effectiveCollapsed = isCollapsed && !isMobileOpen

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-gradient-to-b from-navy-900 to-navy-800 transition-all duration-300',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
        isCollapsed ? 'lg:w-[68px]' : 'lg:w-60',
        'w-72 lg:w-auto'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        <div className="flex items-center gap-3">
          {!effectiveCollapsed && (
            <>
              <img 
                src="/assets/logo.png" 
                alt="SmartLog" 
                className="h-8 w-auto brightness-0 invert"
              />
              <div>
                <h1 className="text-sm font-bold text-moon-50">SmartLog <span className="text-ice-light">SWM</span></h1>
                <p className="text-[11px] text-moon-100/50">TVL Warehouse Platform</p>
              </div>
            </>
          )}
          {effectiveCollapsed && (
            <img 
              src="/assets/logo.png" 
              alt="SmartLog" 
              className="mx-auto h-7 w-auto brightness-0 invert"
            />
          )}
        </div>
        <button
          onClick={onMobileClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-moon-100/60 transition-colors hover:bg-sidebar-hover hover:text-moon-50 lg:hidden"
          aria-label="Đóng menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="sidebar-nav flex-1 overflow-y-auto px-3 py-3 overscroll-contain">
        <div className="space-y-0.5">
          {menuConfig.map((entry, idx) => {
            if (entry._divider) {
              return (
                <div key={`divider-${idx}`} className="pt-3 pb-1.5">
                  {!effectiveCollapsed && (
                    <p className="sidebar-section-label">{entry.label}</p>
                  )}
                  {effectiveCollapsed && (
                    <div className="mx-auto w-5 border-t border-sidebar-border/30" />
                  )}
                </div>
              )
            }
            return (
              <MenuItem
                key={entry.id}
                item={entry}
                isCollapsed={effectiveCollapsed}
                isExpanded={expandedId === entry.id}
                onToggle={() => handleToggle(entry.id)}
              />
            )
          })}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!effectiveCollapsed && <LanguageSwitcher variant="sidebar" />}
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
