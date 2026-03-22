import { useCallback, useMemo, useState } from 'react'
import { Plus, Package, Layers, ShieldCheck, Lock, RotateCw, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { useOnHandList } from '@domains/inventory-core'
import { useLookupInventoryStatuses, useLookupItems, useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { InventoryStatusBadge } from '@domains/master-data/components/StatusBadge'
import { Button, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Pagination } from '@shared/ui'
import { InventoryPostingDrawer } from '@features/inventory-core'

const TOTAL_COLS = 13

function formatKg(value) {
  const num = Number(value)
  if (isNaN(num)) return '—'
  return num.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' kg'
}

function formatQty(value) {
  const num = Number(value)
  if (isNaN(num) || num === 0) return '0'
  // Nếu là số nguyên thì không hiện decimal, nếu có lẻ thì hiện tối đa 3
  const decimals = num % 1 === 0 ? 0 : 3
  return num.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

function KpiCard({ icon: Icon, label, value, color = 'ice', subtext }) {
  const colorMap = {
    ice: 'from-ice/10 to-ice/5 text-ice border-ice/20',
    emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 text-amber-600 border-amber-500/20',
    navy: 'from-navy-500/10 to-navy-500/5 text-navy-600 border-navy-500/20',
  }
  return (
    <div className={`wrs-card p-4 border bg-gradient-to-br ${colorMap[color]} flex items-start gap-3`}>
      <div className={`flex-shrink-0 p-2 rounded-lg bg-white/60 shadow-sm`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-navy-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-navy-900 mt-0.5 truncate">{value}</p>
        {subtext && <p className="text-xs text-navy-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
  )
}

export function InventoryOnHandPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    itemId: '',
    warehouseId: '',
    ownerId: '',
    inventoryStatusId: '',
    hasStock: true,
  })
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: response, isLoading, refetch } = useOnHandList({
    ...filters,
    itemId: filters.itemId || undefined,
    warehouseId: filters.warehouseId || undefined,
    ownerId: filters.ownerId || undefined,
    inventoryStatusId: filters.inventoryStatusId || undefined,
  })

  const { data: itemOptions = [] } = useLookupItems()
  const { data: ownerOptions = [] } = useLookupOwners()
  const { data: warehouseOptions = [] } = useLookupWarehouses()
  const { data: statusOptions = [] } = useLookupInventoryStatuses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  // Compute KPI summary from current rows (client-side summary of loaded data)
  const kpiSummary = useMemo(() => {
    let totalPhysical = 0
    let totalAvailable = 0
    let totalAllocated = 0
    let totalInboundOrdered = 0
    let totalOutboundOrdered = 0
    const uniqueItems = new Set()
    for (const row of rows) {
      totalPhysical += Number(row.physicalQty) || 0
      totalAvailable += Number(row.availableQty) || 0
      totalAllocated += Number(row.allocatedQty) || 0
      totalInboundOrdered += Number(row.inboundOrderedQty) || 0
      totalOutboundOrdered += Number(row.outboundOrderedQty) || 0
      if (row.item?.itemCode) uniqueItems.add(row.item.itemCode)
    }
    return { totalPhysical, totalAvailable, totalAllocated, totalInboundOrdered, totalOutboundOrdered, uniqueItems: uniqueItems.size }
  }, [rows])

  const handleChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }, [])

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-title">Tồn kho hiện tại</h2>
          <p className="text-sm text-navy-400 mt-0.5">Theo dõi số lượng hàng hóa tồn kho thực tế — tất cả đơn vị quy đổi sang kg</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
                <RotateCw className="h-4 w-4 mr-2" />
                Điều chỉnh tồn kho
              </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6 mb-4">
        <KpiCard icon={Package} label="Tồn vật lý" value={formatKg(kpiSummary.totalPhysical)} color="ice" subtext={`${pagination.total || rows.length} dòng`} />
        <KpiCard icon={ShieldCheck} label="Khả dụng" value={formatKg(kpiSummary.totalAvailable)} color="emerald" />
        <KpiCard icon={Lock} label="Đã giữ chỗ" value={formatKg(kpiSummary.totalAllocated)} color="amber" />
        <KpiCard icon={ArrowDownCircle} label="Sắp nhập" value={formatKg(kpiSummary.totalInboundOrdered)} color="ice" subtext="inbound ordered" />
        <KpiCard icon={ArrowUpCircle} label="Nhu cầu xuất" value={formatKg(kpiSummary.totalOutboundOrdered)} color="amber" subtext="outbound ordered" />
        <KpiCard icon={Layers} label="Mặt hàng" value={kpiSummary.uniqueItems} color="navy" subtext="loại hàng hóa" />
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Select
              value={filters.ownerId}
              onChange={(e) => handleChange('ownerId', e.target.value)}
              placeholder="Tất cả chủ hàng"
              options={ownerOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Select
              value={filters.itemId}
              onChange={(e) => handleChange('itemId', e.target.value)}
              placeholder="Tất cả mặt hàng"
              options={itemOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Select
              value={filters.inventoryStatusId}
              onChange={(e) => handleChange('inventoryStatusId', e.target.value)}
              placeholder="Tất cả trạng thái"
              options={statusOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Select
              value={filters.warehouseId}
              onChange={(e) => handleChange('warehouseId', e.target.value)}
              placeholder="Tất cả kho"
              options={warehouseOptions.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
            />
            <Select
              value={String(filters.hasStock)}
              onChange={(e) => handleChange('hasStock', e.target.value === 'true')}
              options={[
                { value: 'true', label: 'Chỉ có tồn kho' },
                { value: 'false', label: 'Bao gồm tồn = 0' },
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow hoverable={false}>
                  <TableHead>Mã chủ hàng</TableHead>
                  <TableHead>Tên chủ hàng</TableHead>
                  <TableHead>Mã hàng</TableHead>
                  <TableHead>Tên hàng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Lô</TableHead>
                  <TableHead>Vị trí</TableHead>
                  <TableHead align="right">Thực tế</TableHead>
                  <TableHead align="right">Đã giữ</TableHead>
                  <TableHead align="right">Khả dụng</TableHead>
                  <TableHead align="right">Sắp nhập</TableHead>
                  <TableHead align="right">Nhu cầu xuất</TableHead>
                  <TableHead>ĐVT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <TableLoading colSpan={TOTAL_COLS} /> : null}
                {!isLoading && rows.length === 0 ? <TableEmpty colSpan={TOTAL_COLS} message="Không có dữ liệu tồn kho phù hợp" /> : null}
                {!isLoading ? rows.map((row) => {
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="font-mono font-semibold text-navy-900">{row.inventDim?.owner?.ownerCode || '—'}</span>
                      </TableCell>
                      <TableCell className="text-navy-700">{row.inventDim?.owner?.ownerName || '—'}</TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold text-navy-900">{row.item?.itemCode || row.item?.itemName || '—'}</span>
                      </TableCell>
                      <TableCell className="text-navy-700">{row.item?.itemName || '—'}</TableCell>
                      <TableCell>
                        <InventoryStatusBadge statusCode={row.inventDim?.inventoryStatus?.statusCode} />
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-navy-600">{row.inventDim?.location?.locationCode || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-navy-600">
                          {row.inventDim?.warehouse?.warehouseName || row.inventDim?.zone?.zoneName || '—'}
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <span className="font-semibold text-navy-900">{formatQty(row.physicalQty)}</span>
                      </TableCell>
                      <TableCell align="right">
                        <span className="text-navy-600">{formatQty(row.allocatedQty)}</span>
                      </TableCell>
                      <TableCell align="right">
                        <span className="font-semibold text-emerald-600">{formatQty(row.availableQty)}</span>
                      </TableCell>
                      <TableCell align="right">
                        <span className="text-ice">{formatQty(row.inboundOrderedQty)}</span>
                      </TableCell>
                      <TableCell align="right">
                        <span className="text-amber-600">{formatQty(row.outboundOrderedQty)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-medium text-navy-700">KG</span>
                      </TableCell>
                    </TableRow>
                  )
                }) : null}
              </TableBody>
            </Table>
          </div>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => handleChange('page', page)} />
      </div>

      <InventoryPostingDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}

