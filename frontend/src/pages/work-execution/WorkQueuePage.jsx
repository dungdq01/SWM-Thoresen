import { useState } from 'react'
import { useWorks, useClaimWork, useCancelWork, useWorkDashboardSummary } from '@domains/work-execution'
import { useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, MiniBarList, Pagination, Select, SummaryDonut, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'CANCELLED') return 'danger'
  if (status === 'IN_PROGRESS') return 'warning'
  return 'info'
}

const workTypeTone = (workType) => {
  if (workType === 'PICK') return 'danger'
  if (workType === 'PUTAWAY') return 'success'
  if (['TRANSFER_PICK', 'TRANSFER_PUT'].includes(workType)) return 'warning'
  return 'info'
}

export function WorkQueuePage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, status: '', workType: '', warehouseId: '' })

  const { data: summaryResponse } = useWorkDashboardSummary(filters.warehouseId)
  const summary = summaryResponse?.data || {}

  const { data: response, isLoading, refetch } = useWorks({
    ...filters,
    status: filters.status || undefined,
    workType: filters.workType || undefined,
    warehouseId: filters.warehouseId || undefined,
  })

  const claimWork = useClaimWork()
  const cancelWork = useCancelWork()

  const { data: warehouses = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Hàng đợi công việc</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Trạng thái hàng đợi</h3>
          <SummaryDonut
            centerLabel="Tổng"
            data={[
              { name: 'Mở', value: summary.totalOpen || 0, color: '#1e3a5f' },
              { name: 'Đang thực hiện', value: summary.totalInProgress || 0, color: '#d97706' },
              { name: 'Hoàn thành', value: summary.totalCompleted || 0, color: '#059669' },
              { name: 'Ngoại lệ', value: summary.exceptionsOpen || 0, color: '#e11d48' },
            ]}
          />
        </div>
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Công việc mở theo loại</h3>
          <MiniBarList
            data={[
              { name: 'Lấy hàng', value: summary.pickOpen || 0, color: '#e11d48' },
              { name: 'Cất hàng', value: summary.putawayOpen || 0, color: '#059669' },
              { name: 'Di chuyển', value: summary.moveOpen || 0, color: '#3b82f6' },
            ]}
          />
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Quick status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {[{ value: '', label: 'Tất cả' }, { value: 'OPEN', label: 'OPEN' }, { value: 'IN_PROGRESS', label: 'IN_PROGRESS' }, { value: 'COMPLETED', label: 'COMPLETED' }, { value: 'CANCELLED', label: 'CANCELLED' }].map((s) => (
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
        <div className="grid gap-4 md:grid-cols-2">
          <Select value={filters.workType} onChange={(e) => setFilters((prev) => ({ ...prev, workType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'PUTAWAY', label: 'PUTAWAY' }, { value: 'PICK', label: 'PICK' }, { value: 'MOVE', label: 'MOVE' }, { value: 'TRANSFER_PICK', label: 'TRANSFER_PICK' }, { value: 'TRANSFER_PUT', label: 'TRANSFER_PUT' }]} placeholder="Loại công việc" />
          <Select value={filters.warehouseId} onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} placeholder="Kho" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã công việc</TableHead>
              <TableHead>Loại / Ưu tiên</TableHead>
              <TableHead>Nguồn</TableHead>
              <TableHead>Được giao cho</TableHead>
              <TableHead align="right">Dòng / SL</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={7} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={7} message="Hàng đợi trống" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.workId}</p>
                  <p className="text-xs text-navy-400">{row.warehouse?.code || row.warehouseId}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={workTypeTone(row.workType)}>{row.workType}</Badge>
                  <p className="text-xs text-navy-400 mt-1">Ưu tiên: {row.priority}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.sourceType}</p>
                  <p className="text-xs text-navy-400">{row.sourceId}</p>
                </TableCell>
                <TableCell>
                  <p className="text-navy-800">{row.assignedTo || '—'}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.lines?.length || 0} dòng</p>
                  <p className="text-xs text-navy-400">{row.lines?.reduce((sum, l) => sum + (l.expectedQty || 0), 0).toLocaleString()} kg</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'OPEN' && !row.assignedTo && (
                      <Button variant="accent" size="sm" onClick={() => claimWork.mutate({ id: row.id, data: {} })}>Nhận</Button>
                    )}
                    {['OPEN', 'IN_PROGRESS'].includes(row.status) && (
                      <Button variant="ghost" size="sm" onClick={() => cancelWork.mutate({ id: row.id, data: { reasonCode: 'CANCELLED' } })}>Hủy</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>
    </>
  )
}
