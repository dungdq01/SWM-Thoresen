import { useState } from 'react'
import { useInventoryReport } from '@domains/reporting'
import { Badge, Button, Input, Pagination, SummaryDonut, StatHighlight, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả status' },
  { value: 'AVAIL', label: 'AVAIL' },
  { value: 'QC_HOLD', label: 'QC_HOLD' },
  { value: 'DAMAGED', label: 'DAMAGED' },
  { value: 'BLOCKED', label: 'BLOCKED' },
]

const statusTone = (s) => {
  if (s === 'AVAIL') return 'success'
  if (s === 'QC_HOLD') return 'warning'
  if (s === 'DAMAGED' || s === 'BLOCKED') return 'danger'
  return 'default'
}

export function InventoryReportPage() {
  const [filters, setFilters] = useState({ inventoryStatus: '', page: 1, pageSize: 20 })

  const { data: response, isLoading } = useInventoryReport(filters)
  const rows = response?.data || []
  const pagination = response?.pagination || {}

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  const setPage = (page) => setFilters((prev) => ({ ...prev, page }))

  // Summary totals
  const totalOnHand = rows.reduce((s, r) => s + (Number(r.qty) || 0), 0)
  const totalReserved = rows.reduce((s, r) => s + (Number(r.reservedQty) || 0), 0)
  const totalAvailable = rows.reduce((s, r) => s + (Number(r.availableQty) || 0), 0)

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Báo cáo tồn kho</h2>
        <p className="text-xs text-navy-400">Chỉ đọc · Dữ liệu = SUM(InventTrans) signed qty theo từng InventDim</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Phân bổ tồn kho</h3>
          <SummaryDonut
            centerLabel="Tồn kho"
            centerValue={totalOnHand.toLocaleString()}
            data={[
              { name: 'Khả dụng', value: totalAvailable, color: '#059669' },
              { name: 'Đã giữ', value: totalReserved, color: '#d97706' },
            ]}
          />
        </div>
        <div className="wrs-card p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-navy-900">Tổng hợp tồn kho</h3>
          <StatHighlight value={totalOnHand.toLocaleString()} label="Tổng tồn kho (KG)" color="text-navy-900" bgColor="bg-moon-50" />
          <StatHighlight value={totalReserved.toLocaleString()} label="Đã giữ (KG)" color="text-amber-600" bgColor="bg-amber-50" />
          <StatHighlight value={totalAvailable.toLocaleString()} label="Khả dụng (KG)" color="text-emerald-600" bgColor="bg-emerald-50" />
        </div>
      </div>

      {/* Filters */}
      <div className="wrs-card p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Tìm item code, tên, location..."
            value={filters.itemId || ''}
            onChange={(e) => setFilter('itemId', e.target.value)}
            className="w-64"
          />
          <select
            className="wrs-input h-9 text-sm"
            value={filters.inventoryStatus}
            onChange={(e) => setFilter('inventoryStatus', e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({ inventoryStatus: '', page: 1, pageSize: 20 })}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="wrs-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chủ hàng</TableHead>
              <TableHead>Mã hàng</TableHead>
              <TableHead>Tên hàng</TableHead>
              <TableHead>Vị trí</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Tồn kho (KG)</TableHead>
              <TableHead className="text-right">Đã giữ (KG)</TableHead>
              <TableHead className="text-right">Khả dụng (KG)</TableHead>
              <TableHead className="text-right">Số bao</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading cols={9} />}
            {!isLoading && rows.length === 0 && <TableEmpty cols={9} message="Không có dữ liệu" />}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="font-semibold text-navy-900">{row.ownerCode}</span>
                </TableCell>
                <TableCell className="font-mono text-xs">{row.itemCode}</TableCell>
                <TableCell className="text-navy-700">{row.itemName}</TableCell>
                <TableCell className="font-mono text-xs text-navy-600">{row.locationCode}</TableCell>
                <TableCell>
                  <Badge variant={statusTone(row.inventoryStatus)}>{row.inventoryStatus}</Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-navy-900">
                  {Number(row.qty || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-amber-600">
                  {Number(row.reservedQty) > 0 ? Number(row.reservedQty).toLocaleString() : '—'}
                </TableCell>
                <TableCell className={`text-right font-semibold ${Number(row.availableQty) > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {Number(row.availableQty || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-navy-600">
                  —
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pagination.total > 0 && (
          <div className="p-3 border-t border-moon-200">
            <Pagination
              page={filters.page}
              pageSize={filters.pageSize}
              total={pagination.total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </>
  )
}
