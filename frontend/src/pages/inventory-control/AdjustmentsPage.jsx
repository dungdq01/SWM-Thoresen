import { useState } from 'react'
import { useAdjustments, useCreateAdjustment, useSubmitAdjustment, useApproveAdjustment, usePostAdjustment } from '@domains/inventory-control'
import { useLookupItems, useLookupOwners, useLookupWarehouses, useLookupLocations } from '@domains/master-data'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'
import { AdjustmentFormDrawer } from '@features/inventory-control'

const statusTone = (status) => {
  if (status === 'POSTED') return 'success'
  if (['CANCELLED', 'FAILED', 'REJECTED'].includes(status)) return 'danger'
  if (['PENDING_APPROVAL', 'APPROVED'].includes(status)) return 'warning'
  return 'default'
}

export function AdjustmentsPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', sourceType: '' })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeWarehouseId, setActiveWarehouseId] = useState('')

  const { data: response, isLoading, refetch } = useAdjustments(filters)
  const createAdjustment = useCreateAdjustment()
  const submitAdjustment = useSubmitAdjustment()
  const approveAdjustment = useApproveAdjustment()
  const postAdjustment = usePostAdjustment()

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: locations = [] } = useLookupLocations(activeWarehouseId)

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleSubmit = async (payload) => {
    setActiveWarehouseId(payload.warehouseId)
    await createAdjustment.mutateAsync(payload)
    setDrawerOpen(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Điều chỉnh tồn kho</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => setDrawerOpen(true)}>Tạo phiếu điều chỉnh</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Quick status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'DRAFT' }, { value: 'PENDING_APPROVAL', label: 'PENDING_APPROVAL' }, { value: 'APPROVED', label: 'APPROVED' }, { value: 'POSTED', label: 'POSTED' }].map((s) => (
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
          <Select value={filters.sourceType} onChange={(e) => setFilters((prev) => ({ ...prev, sourceType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'MANUAL', label: 'MANUAL' }, { value: 'CYCLE_COUNT', label: 'CYCLE_COUNT' }, { value: 'RECONCILIATION', label: 'RECONCILIATION' }]} placeholder="Loại nguồn" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Số phiếu</TableHead>
              <TableHead>Kho / Nguồn</TableHead>
              <TableHead align="right">Dòng / SL</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={5} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="Chưa có phiếu điều chỉnh nào" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.adjustmentNumber}</p>
                  <p className="text-xs text-navy-400">{row.sourceRefId || 'N/A'}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.warehouse?.code || row.warehouseId}</p>
                  <p className="text-xs text-navy-400">{row.sourceType}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.lines?.length || 0} dòng</p>
                  <p className="text-xs text-navy-400">{row.lines?.reduce((sum, l) => sum + (l.adjustQty || 0), 0).toLocaleString()} kg</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'DRAFT' && <Button variant="outline" size="sm" onClick={() => submitAdjustment.mutate(row.id)}>Gửi duyệt</Button>}
                    {row.status === 'PENDING_APPROVAL' && <Button variant="accent" size="sm" onClick={() => approveAdjustment.mutate(row.id)}>Duyệt</Button>}
                    {row.status === 'APPROVED' && <Button variant="accent" size="sm" onClick={() => postAdjustment.mutate(row.id)}>Đăng sổ</Button>}
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      <AdjustmentFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        isLoading={createAdjustment.isPending}
        warehouses={warehouses}
        items={items}
        owners={owners}
        locations={locations}
      />
    </>
  )
}
