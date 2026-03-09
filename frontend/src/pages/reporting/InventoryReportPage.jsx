import { useState } from 'react'
import { useInventoryReport } from '@domains/reporting'
import { Badge, Button, Input, Pagination, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

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
  const [filters, setFilters] = useState({ keyword: '', statusCode: '', page: 1, limit: 20 })

  const { data: response, isLoading } = useInventoryReport(filters)
  const rows = response?.data || []
  const pagination = response?.pagination || {}

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  const setPage = (page) => setFilters((prev) => ({ ...prev, page }))

  // Summary totals
  const totalOnHand = rows.reduce((s, r) => s + r.onHandKg, 0)
  const totalReserved = rows.reduce((s, r) => s + r.reservedKg, 0)
  const totalAvailable = rows.reduce((s, r) => s + r.availableKg, 0)

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Inventory Report — On-Hand Summary</h2>
        <p className="text-xs text-navy-400">Chỉ đọc · Dữ liệu = SUM(InventTrans) signed qty theo từng InventDim</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-navy-900">{totalOnHand.toLocaleString()}</p>
          <p className="text-xs text-navy-500">Total On-Hand (KG)</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{totalReserved.toLocaleString()}</p>
          <p className="text-xs text-navy-500">Reserved (KG)</p>
        </div>
        <div className="wrs-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{totalAvailable.toLocaleString()}</p>
          <p className="text-xs text-navy-500">Available (KG)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="wrs-card p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Tìm item code, tên, location..."
            value={filters.keyword}
            onChange={(e) => setFilter('keyword', e.target.value)}
            className="w-64"
          />
          <select
            className="wrs-input h-9 text-sm"
            value={filters.statusCode}
            onChange={(e) => setFilter('statusCode', e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({ keyword: '', statusCode: '', page: 1, limit: 20 })}
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
              <TableHead>Owner</TableHead>
              <TableHead>Item Code</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">On-Hand (KG)</TableHead>
              <TableHead className="text-right">Reserved (KG)</TableHead>
              <TableHead className="text-right">Available (KG)</TableHead>
              <TableHead className="text-right">Bags</TableHead>
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
                  <Badge variant={statusTone(row.statusCode)}>{row.statusCode}</Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-navy-900">
                  {row.onHandKg.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-amber-600">
                  {row.reservedKg > 0 ? row.reservedKg.toLocaleString() : '—'}
                </TableCell>
                <TableCell className={`text-right font-semibold ${row.availableKg > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {row.availableKg.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-navy-600">
                  {row.bagCount > 0 ? row.bagCount.toLocaleString() : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pagination.total > 0 && (
          <div className="p-3 border-t border-moon-200">
            <Pagination
              page={filters.page}
              pageSize={filters.limit}
              total={pagination.total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
