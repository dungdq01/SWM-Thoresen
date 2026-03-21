import { useState } from 'react'
import { Package, RefreshCw, CheckCircle, XCircle, Eye } from 'lucide-react'
import {
  useShipments,
  useAllocateShipment,
  useUnallocateShipment,
} from '@domains/outbound-operations'
import {
  Badge, Button, Input, Pagination,
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow,
} from '@shared/ui'

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'ALLOCATED', label: 'Đã phân bổ' },
  { value: 'PICKING', label: 'Đang lấy hàng' },
]

const statusTone = (status) => {
  if (status === 'CONFIRMED') return 'info'
  if (status === 'ALLOCATED') return 'success'
  if (status === 'PICKING') return 'warning'
  return 'default'
}

const STATUS_LABELS = {
  CONFIRMED: 'Đã xác nhận',
  ALLOCATED: 'Đã phân bổ',
  PICKING: 'Đang lấy hàng',
}

export function OutboundAllocationPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', status: '' })

  const { data: response, isLoading, refetch } = useShipments({
    ...filters,
    keyword: filters.keyword || undefined,
    status: filters.status || undefined,
  })
  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const allocate = useAllocateShipment()
  const unallocate = useUnallocateShipment()

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ice/10">
            <Package className="w-5 h-5 text-ice" />
          </div>
          <div>
            <h2 className="section-title">Phân bổ kho</h2>
            <p className="text-sm text-navy-400">Phân bổ tồn kho cho các phiếu xuất đã xác nhận</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Status filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilters((prev) => ({ ...prev, status: s.value, page: 1 }))}
              className={[
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                filters.status === s.value
                  ? 'bg-ice text-navy-950 border-ice'
                  : 'bg-transparent text-navy-400 border-moon-200 hover:border-ice hover:text-ice',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <Input
          placeholder="Tìm theo số phiếu, số SO, biển số xe..."
          value={filters.keyword}
          onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 1 }))}
        />

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Phiếu xuất</TableHead>
              <TableHead>Số SO</TableHead>
              <TableHead>Chủ hàng</TableHead>
              <TableHead>Số xe</TableHead>
              <TableHead align="right">SL dự kiến (kg)</TableHead>
              <TableHead align="right">SL phân bổ (kg)</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading colSpan={8} />}
            {!isLoading && rows.length === 0 && (
              <TableEmpty colSpan={8} message="Không có phiếu xuất nào cần phân bổ." />
            )}
            {!isLoading && rows.map((shp) => {
              const totalExpected = (shp.lines || []).reduce((sum, l) => sum + Number(l.expectedQty || 0), 0)
              const totalAllocated = (shp.lines || []).reduce((sum, l) => sum + Number(l.allocatedQty || 0), 0)
              return (
                <TableRow key={shp.id}>
                  <TableCell>
                    <p className="font-semibold text-navy-900">{shp.shipmentNumber || '—'}</p>
                    <p className="text-xs text-navy-400">{shp.lines?.length || 0} dòng</p>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-navy-600">{shp.soNumber || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-800">{shp.owner?.ownerCode || '—'}</p>
                    <p className="text-xs text-navy-400">{shp.owner?.ownerName || ''}</p>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-navy-700">{shp.vehicleNumber || '—'}</span>
                  </TableCell>
                  <TableCell align="right">
                    <span className="font-medium text-navy-900 tabular-nums">
                      {totalExpected.toLocaleString('vi-VN')}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <span className={totalAllocated > 0 ? 'font-medium text-emerald-600 tabular-nums' : 'text-navy-400 tabular-nums'}>
                      {totalAllocated.toLocaleString('vi-VN')}
                    </span>
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={statusTone(shp.status)}>
                      {STATUS_LABELS[shp.status] || shp.status}
                    </Badge>
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex justify-center gap-1">
                      {shp.status === 'CONFIRMED' && (
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => allocate.mutate(shp.id)}
                          disabled={allocate.isPending}
                          title="Phân bổ"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Phân bổ
                        </Button>
                      )}
                      {shp.status === 'ALLOCATED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unallocate.mutate(shp.id)}
                          disabled={unallocate.isPending}
                          title="Hủy phân bổ"
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Hủy PB
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      </div>
    </>
  )
}
