import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, ArrowRight,
  LayoutDashboard, Database, Boxes, Truck, TruckIcon,
  Settings, ClipboardList, Waypoints, Package, FileText,
  BarChart3, Building2, Ship, MapPin, Grid3X3, Scale,
  Tags, Shield, Tag, Hash, BookOpen, Users, CheckSquare,
  ClipboardCheck, AlertTriangle, RefreshCw, LayoutGrid,
} from 'lucide-react'
import { cn } from '@shared/lib/cn'

// ── Icon map ──
const ICON_MAP = {
  LayoutDashboard, Database, Boxes, Truck, TruckIcon,
  Settings, ClipboardList, Waypoints, Package, FileText,
  BarChart3, Building2, Ship, MapPin, Grid3X3, Scale,
  Tags, Shield, Tag, Hash, BookOpen, Users, CheckSquare,
  ClipboardCheck, AlertTriangle, RefreshCw, LayoutGrid,
}

// ── Searchable items: Modules (pages) ──
const MODULE_ITEMS = [
  // Dashboard
  { id: 'dashboard', label: 'Dashboard', labelVi: 'Trang chủ', group: 'Center', route: '/app', icon: 'LayoutDashboard', type: 'module' },
  // Master Data
  { id: 'owners', label: 'Owners', labelVi: 'Chủ hàng', group: 'Master Data', route: '/app/master-data/owners', icon: 'Building2', type: 'module' },
  { id: 'vendors', label: 'Vendors', labelVi: 'Nhà cung cấp', group: 'Master Data', route: '/app/master-data/vendors', icon: 'Ship', type: 'module' },
  { id: 'items', label: 'Items', labelVi: 'Hàng hóa / SKU', group: 'Master Data', route: '/app/master-data/items', icon: 'Package', type: 'module' },
  { id: 'warehouses', label: 'Warehouses', labelVi: 'Kho', group: 'Master Data', route: '/app/master-data/warehouses', icon: 'Package', type: 'module' },
  { id: 'zones', label: 'Zones', labelVi: 'Phân vùng kho', group: 'Master Data', route: '/app/master-data/zones', icon: 'Grid3X3', type: 'module' },
  { id: 'locations', label: 'Locations', labelVi: 'Vị trí kho', group: 'Master Data', route: '/app/master-data/locations', icon: 'MapPin', type: 'module' },
  { id: 'uoms', label: 'Units of Measure', labelVi: 'Đơn vị tính', group: 'Master Data', route: '/app/master-data/uoms', icon: 'Scale', type: 'module' },
  { id: 'vehicle-types', label: 'Vehicle Types', labelVi: 'Loại phương tiện', group: 'Master Data', route: '/app/master-data/vehicle-types', icon: 'Truck', type: 'module' },
  { id: 'inventory-statuses', label: 'Inventory Statuses', labelVi: 'Trạng thái tồn kho', group: 'Master Data', route: '/app/master-data/inventory-statuses', icon: 'Tags', type: 'module' },
  // Inventory Core
  { id: 'on-hand', label: 'On-hand', labelVi: 'Tồn kho hiện tại', group: 'Inventory Core', route: '/app/inventory-core/on-hand', icon: 'Boxes', type: 'module' },
  { id: 'transactions', label: 'Transactions', labelVi: 'Sổ cái giao dịch', group: 'Inventory Core', route: '/app/inventory-core/transactions', icon: 'FileText', type: 'module' },
  { id: 'holds', label: 'Holds', labelVi: 'Giữ hàng', group: 'Inventory Core', route: '/app/inventory-core/holds', icon: 'Shield', type: 'module' },
  { id: 'workbench', label: 'Posting Workbench', labelVi: 'Bàn làm việc', group: 'Inventory Core', route: '/app/inventory-core/workbench', icon: 'BookOpen', type: 'module' },
  // Inbound
  { id: 'receipts', label: 'Receipts', labelVi: 'Phiếu nhận hàng', group: 'Inbound', route: '/app/inbound-operations/receipts', icon: 'ClipboardCheck', type: 'module' },
  { id: 'inbound-execution', label: 'Inbound Execution', labelVi: 'Cân xe nhập', group: 'Inbound', route: '/app/inbound-operations/execution', icon: 'Scale', type: 'module' },
  { id: 'exceptions', label: 'Exceptions', labelVi: 'Ngoại lệ nhập', group: 'Inbound', route: '/app/inbound-operations/exceptions', icon: 'AlertTriangle', type: 'module' },
  { id: 'putaway', label: 'Putaway', labelVi: 'Nhập vị trí kho', group: 'Inbound', route: '/app/inbound-operations/putaway', icon: 'Waypoints', type: 'module' },
  // Outbound
  { id: 'shipments', label: 'Shipments', labelVi: 'Phiếu xuất kho', group: 'Outbound', route: '/app/outbound-operations/shipments', icon: 'ClipboardList', type: 'module' },
  { id: 'allocation', label: 'Allocation', labelVi: 'Phân bổ tồn kho', group: 'Outbound', route: '/app/outbound-operations/allocation', icon: 'Package', type: 'module' },
  { id: 'outbound-weighing', label: 'Outbound Weighing', labelVi: 'Cân xuất kho', group: 'Outbound', route: '/app/outbound-operations/weighing', icon: 'Scale', type: 'module' },
  { id: 'approvals', label: 'Approvals', labelVi: 'Phê duyệt xuất', group: 'Outbound', route: '/app/outbound-operations/approvals', icon: 'CheckSquare', type: 'module' },
  // Inventory Control
  { id: 'move-orders', label: 'Move Orders', labelVi: 'Lệnh di chuyển', group: 'Inventory Control', route: '/app/inventory-control/move-orders', icon: 'Waypoints', type: 'module' },
  { id: 'transfers', label: 'Transfers', labelVi: 'Chuyển kho', group: 'Inventory Control', route: '/app/inventory-control/transfers', icon: 'Package', type: 'module' },
  { id: 'status-change', label: 'Status Change', labelVi: 'Đổi trạng thái', group: 'Inventory Control', route: '/app/inventory-control/status-change', icon: 'Tag', type: 'module' },
  { id: 'cycle-count', label: 'Cycle Count', labelVi: 'Kiểm kê', group: 'Inventory Control', route: '/app/inventory-control/cycle-count', icon: 'ClipboardCheck', type: 'module' },
  { id: 'adjustments', label: 'Adjustments', labelVi: 'Điều chỉnh tồn kho', group: 'Inventory Control', route: '/app/inventory-control/adjustments', icon: 'Scale', type: 'module' },
  { id: 'history', label: 'Movement History', labelVi: 'Lịch sử di chuyển', group: 'Inventory Control', route: '/app/inventory-control/history', icon: 'FileText', type: 'module' },
  // Work Execution
  { id: 'work-queue', label: 'Work Queue', labelVi: 'Hàng đợi công việc', group: 'Work Execution', route: '/app/work-execution/queue', icon: 'ClipboardCheck', type: 'module' },
  { id: 'my-work', label: 'My Work', labelVi: 'Việc của tôi', group: 'Work Execution', route: '/app/work-execution/my-work', icon: 'FileText', type: 'module' },
  { id: 'execute', label: 'Execute', labelVi: 'Thực hiện', group: 'Work Execution', route: '/app/work-execution/execute', icon: 'CheckSquare', type: 'module' },
  { id: 'monitor', label: 'Monitor', labelVi: 'Giám sát', group: 'Work Execution', route: '/app/work-execution/monitor', icon: 'Users', type: 'module' },
  // Integration
  { id: 'integration-monitoring', label: 'Integration Monitoring', labelVi: 'Giám sát tích hợp', group: 'Integration', route: '/app/integration/monitoring', icon: 'Shield', type: 'module' },
  { id: 'alerts', label: 'Integration Alerts', labelVi: 'Cảnh báo tích hợp', group: 'Integration', route: '/app/integration/alerts', icon: 'AlertTriangle', type: 'module' },
  { id: 'weighbridge', label: 'Weighbridge', labelVi: 'Trạm cân', group: 'Integration', route: '/app/integration/weighbridge', icon: 'Scale', type: 'module' },
  { id: 'channels', label: 'Channels', labelVi: 'Kênh tích hợp', group: 'Integration', route: '/app/integration/channels', icon: 'Waypoints', type: 'module' },
  // VAS
  { id: 'vas-work-orders', label: 'VAS Work Orders', labelVi: 'Lệnh đóng bao', group: 'VAS / Bagging', route: '/app/vas/work-orders', icon: 'ClipboardList', type: 'module' },
  { id: 'vas-execution', label: 'VAS Execution', labelVi: 'Thực hiện đóng bao', group: 'VAS / Bagging', route: '/app/vas/execution', icon: 'CheckSquare', type: 'module' },
  { id: 'vas-dashboard', label: 'VAS Dashboard', labelVi: 'Tổng quan VAS', group: 'VAS / Bagging', route: '/app/vas/dashboard', icon: 'LayoutGrid', type: 'module' },
  // Billing
  { id: 'invoices', label: 'Invoices / Debit Notes', labelVi: 'Hóa đơn / Debit Note', group: 'Billing', route: '/app/billing/invoices', icon: 'FileText', type: 'module' },
  { id: 'rate-cards', label: 'Rate Cards & Contracts', labelVi: 'Biểu phí & Hợp đồng', group: 'Billing', route: '/app/billing/rate-cards', icon: 'Tag', type: 'module' },
  { id: 'billable-events', label: 'Billable Events', labelVi: 'Sự kiện tính phí', group: 'Billing', route: '/app/billing/events', icon: 'ClipboardCheck', type: 'module' },
  { id: 'billing-dashboard', label: 'Billing Dashboard', labelVi: 'Tổng quan Billing', group: 'Billing', route: '/app/billing/dashboard', icon: 'LayoutGrid', type: 'module' },
  // Reporting
  { id: 'kpi-dashboard', label: 'KPI Dashboard', labelVi: 'Dashboard KPI', group: 'Reporting', route: '/app/reporting/dashboard', icon: 'LayoutGrid', type: 'module' },
  { id: 'inventory-report', label: 'Inventory Report', labelVi: 'Báo cáo tồn kho', group: 'Reporting', route: '/app/reporting/inventory', icon: 'Boxes', type: 'module' },
  { id: 'billing-report', label: 'Billing Report', labelVi: 'Báo cáo doanh thu', group: 'Reporting', route: '/app/reporting/billing', icon: 'FileText', type: 'module' },
  { id: 'audit-trail', label: 'Audit Trail', labelVi: 'Lịch sử thao tác', group: 'Reporting', route: '/app/reporting/audit', icon: 'Shield', type: 'module' },
  { id: 'reconciliation', label: 'Reconciliation', labelVi: 'Đối soát', group: 'Reporting', route: '/app/reporting/reconciliation', icon: 'RefreshCw', type: 'module' },
  { id: 'go-live', label: 'Go-Live Checklist', labelVi: 'Checklist Go-Live', group: 'Reporting', route: '/app/reporting/go-live', icon: 'CheckSquare', type: 'module' },
  // Foundation
  { id: 'roles', label: 'Roles', labelVi: 'Vai trò', group: 'Foundation', route: '/app/settings/roles', icon: 'Users', type: 'module' },
  { id: 'permissions', label: 'Permissions', labelVi: 'Quyền hạn', group: 'Foundation', route: '/app/settings/permissions', icon: 'Shield', type: 'module' },
  { id: 'reason-codes', label: 'Reason Codes', labelVi: 'Mã lý do', group: 'Foundation', route: '/app/settings/reason-codes', icon: 'Tag', type: 'module' },
  { id: 'number-sequences', label: 'Number Sequences', labelVi: 'Chuỗi số', group: 'Foundation', route: '/app/settings/number-sequences', icon: 'Hash', type: 'module' },
  { id: 'governance', label: 'Governance', labelVi: 'Chính sách', group: 'Foundation', route: '/app/settings/governance', icon: 'BookOpen', type: 'module' },
  { id: 'system-logs', label: 'System Logs', labelVi: 'Log hệ thống', group: 'Foundation', route: '/app/settings/logs', icon: 'FileText', type: 'module' },
]

// ── Searchable items: Documents (chứng từ) ──
const DOCUMENT_ITEMS = [
  { id: 'doc-receipt', label: 'Receipt', labelVi: 'Phiếu nhận hàng', group: 'Chứng từ', route: '/app/inbound-operations/receipts', icon: 'ClipboardCheck', type: 'document', keywords: 'RCV PO ASN phiếu nhập nhận hàng' },
  { id: 'doc-shipment', label: 'Shipment', labelVi: 'Phiếu xuất kho', group: 'Chứng từ', route: '/app/outbound-operations/shipments', icon: 'ClipboardList', type: 'document', keywords: 'SHP phiếu xuất giao hàng' },
  { id: 'doc-debit-note', label: 'Debit Note', labelVi: 'Phiếu ghi nợ', group: 'Chứng từ', route: '/app/billing/invoices', icon: 'FileText', type: 'document', keywords: 'DN hóa đơn invoice billing' },
  { id: 'doc-work-order', label: 'VAS Work Order', labelVi: 'Lệnh đóng bao', group: 'Chứng từ', route: '/app/vas/work-orders', icon: 'ClipboardList', type: 'document', keywords: 'WO VAS bagging đóng bao lệnh sản xuất' },
  { id: 'doc-move-order', label: 'Move Order', labelVi: 'Lệnh di chuyển', group: 'Chứng từ', route: '/app/inventory-control/move-orders', icon: 'Waypoints', type: 'document', keywords: 'MO di chuyển nội bộ' },
  { id: 'doc-transfer-order', label: 'Transfer Order', labelVi: 'Lệnh chuyển kho', group: 'Chứng từ', route: '/app/inventory-control/transfers', icon: 'Package', type: 'document', keywords: 'TO chuyển kho liên kho' },
  { id: 'doc-contract', label: 'Contract / Rate Card', labelVi: 'Hợp đồng / Biểu phí', group: 'Chứng từ', route: '/app/billing/rate-cards', icon: 'Tag', type: 'document', keywords: 'hợp đồng contract biểu phí rate card' },
  { id: 'doc-adjustment', label: 'Inventory Adjustment', labelVi: 'Phiếu điều chỉnh', group: 'Chứng từ', route: '/app/inventory-control/adjustments', icon: 'Scale', type: 'document', keywords: 'ADJ điều chỉnh hao hụt' },
  { id: 'doc-cycle-count', label: 'Cycle Count Session', labelVi: 'Phiên kiểm kê', group: 'Chứng từ', route: '/app/inventory-control/cycle-count', icon: 'ClipboardCheck', type: 'document', keywords: 'CC kiểm kê đếm hàng' },
]

const ALL_ITEMS = [...MODULE_ITEMS, ...DOCUMENT_ITEMS]

function normalizeText(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

function searchItems(query) {
  if (!query || query.trim().length === 0) return []

  const normalizedQuery = normalizeText(query.trim())
  const tokens = normalizedQuery.split(/\s+/)

  const scored = ALL_ITEMS.map(item => {
    const fields = [
      item.label,
      item.labelVi,
      item.group,
      item.id,
      item.keywords || '',
    ].join(' ')
    const normalizedFields = normalizeText(fields)

    let score = 0
    let allTokensMatch = true

    for (const token of tokens) {
      if (normalizedFields.includes(token)) {
        score += 10
        // Bonus for label match
        if (normalizeText(item.label).includes(token)) score += 20
        if (normalizeText(item.labelVi).includes(token)) score += 15
        // Bonus for exact start match
        if (normalizeText(item.label).startsWith(token)) score += 30
        if (normalizeText(item.labelVi).startsWith(token)) score += 25
      } else {
        allTokensMatch = false
      }
    }

    // Modules rank higher than documents
    if (item.type === 'module') score += 5

    return { item, score, match: allTokensMatch && score > 0 }
  })

  return scored
    .filter(s => s.match)
    .sort((a, b) => b.score - a.score)
    .map(s => s.item)
    .slice(0, 12)
}

function getIcon(iconName) {
  return ICON_MAP[iconName] || FileText
}

export function CommandSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const containerRef = useRef(null)

  const results = useMemo(() => searchItems(query), [query])

  // Group results by type
  const groupedResults = useMemo(() => {
    const modules = results.filter(r => r.type === 'module')
    const documents = results.filter(r => r.type === 'document')
    const groups = []
    if (modules.length) groups.push({ label: 'Modules', items: modules })
    if (documents.length) groups.push({ label: 'Chứng từ', items: documents })
    return groups
  }, [results])

  const flatResults = useMemo(() => results, [results])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]')
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex])

  const handleSelect = useCallback((item) => {
    navigate(item.route)
    setQuery('')
    setIsOpen(false)
    inputRef.current?.blur()
  }, [navigate])

  const handleKeyDown = useCallback((e) => {
    if (!isOpen || flatResults.length === 0) {
      if (e.key === 'Escape') {
        setQuery('')
        setIsOpen(false)
        inputRef.current?.blur()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => (prev + 1) % flatResults.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => (prev - 1 + flatResults.length) % flatResults.length)
        break
      case 'Enter':
        e.preventDefault()
        if (flatResults[activeIndex]) {
          handleSelect(flatResults[activeIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setQuery('')
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }, [isOpen, flatResults, activeIndex, handleSelect])

  const handleInputChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setIsOpen(val.trim().length > 0)
  }

  const handleFocus = () => {
    if (query.trim().length > 0) {
      setIsOpen(true)
    }
  }

  let flatIndex = -1

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ice" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className={cn(
          'h-10 w-full rounded-xl border border-moon-300 bg-white pl-10 pr-8 text-sm text-navy-900',
          'placeholder:text-navy-400',
          'outline-none transition-all duration-200',
          'focus:border-ice focus:ring-2 focus:ring-ice/20',
          isOpen && flatResults.length > 0 && 'rounded-b-none border-b-transparent'
        )}
        placeholder="Tìm module, chứng từ hoặc vai trò..."
      />
      {query && (
        <button
          onClick={() => { setQuery(''); setIsOpen(false) }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Results dropdown */}
      {isOpen && flatResults.length > 0 && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full z-50 max-h-[360px] overflow-y-auto rounded-b-xl border border-t-0 border-moon-300 bg-white shadow-lg"
        >
          {groupedResults.map((group) => (
            <div key={group.label}>
              <div className="sticky top-0 bg-moon-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-400 border-t border-moon-200 first:border-t-0">
                {group.label}
              </div>
              {group.items.map((item) => {
                flatIndex++
                const idx = flatIndex
                const Icon = getIcon(item.icon)
                const isActive = idx === activeIndex
                return (
                  <button
                    key={item.id}
                    data-active={isActive}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                      isActive
                        ? 'bg-ice/10 text-navy-900'
                        : 'text-navy-700 hover:bg-moon-50'
                    )}
                  >
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      item.type === 'module'
                        ? 'bg-sky-50 text-sky-600'
                        : 'bg-amber-50 text-amber-600'
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.label}</p>
                      <p className="truncate text-xs text-navy-400">
                        {item.labelVi} · {item.group}
                      </p>
                    </div>
                    {isActive && (
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ice" />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && query.trim().length > 0 && flatResults.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 rounded-b-xl border border-t-0 border-moon-300 bg-white p-4 text-center shadow-lg">
          <p className="text-sm text-navy-400">Không tìm thấy kết quả cho &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  )
}
