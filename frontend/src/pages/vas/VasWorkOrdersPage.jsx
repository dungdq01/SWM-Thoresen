import { useState } from 'react'
import { useVasWorkOrders, useCreateVasWorkOrder, useConfirmVasWorkOrder, useCancelVasWorkOrder } from '@domains/vas'
import { useLookupItems, useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'
import { VasWorkOrderFormDrawer } from '@features/vas'

const statusTone = (status) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'CANCELLED') return 'danger'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'CONFIRMED') return 'info'
  return 'default'
}

export function VasWorkOrdersPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', vasType: '' })
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: response, isLoading, refetch } = useVasWorkOrders(filters)
  const createWorkOrder = useCreateVasWorkOrder()
  const confirmWorkOrder = useConfirmVasWorkOrder()
  const cancelWorkOrder = useCancelVasWorkOrder()

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleSubmit = async (payload) => {
    await createWorkOrder.mutateAsync(payload)
    setDrawerOpen(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Đơn Hàng VAS</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => setDrawerOpen(true)}>Tạo Đơn Hàng</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm Mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'Nháp' }, { value: 'CONFIRMED', label: 'Đã Xác Nhận' }, { value: 'IN_PROGRESS', label: 'Đang Thực Hiện' }, { value: 'COMPLETED', label: 'Hoàn Thành' }, { value: 'CANCELLED', label: 'Đã Hủy' }]} placeholder="Trạng Thái" />
          <Select value={filters.vasType} onChange={(e) => setFilters((prev) => ({ ...prev, vasType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'BAGGING', label: 'Đóng Bao' }, { value: 'REPACKING', label: 'Đóng Gói Lại' }]} placeholder="Loại VAS" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Đơn Hàng</TableHead>
              <TableHead>Loại / Mặt Hàng</TableHead>
              <TableHead align="right">Nguồn / Mục Tiêu</TableHead>
              <TableHead align="right">Sản Xuất</TableHead>
              <TableHead align="center">Trạng Thái</TableHead>
              <TableHead align="center">Hành Động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Không có đơn hàng VAS" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.woNumber}</p>
                  <p className="text-xs text-navy-400">{row.owner?.ownerCode || row.ownerId || '-'}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="default">Đóng Bao</Badge>
                  <p className="text-xs text-navy-400 mt-1">{row.bulkSourceItem?.itemCode || row.bulkSourceItemId || '-'}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-medium text-navy-800">{row.plannedQtyKg ? Number(row.plannedQtyKg).toLocaleString() : '-'} kg</p>
                  <p className="text-xs text-navy-400">→ {row.packagingQtyPlanned?.toLocaleString() || '-'} bao</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.actualBagCount?.toLocaleString() || 0}</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'DRAFT' && <Button variant="outline" size="sm" onClick={() => confirmWorkOrder.mutate(row.id)}>Xác Nhận</Button>}
                    {['DRAFT', 'CONFIRMED'].includes(row.status) && <Button variant="ghost" size="sm" onClick={() => cancelWorkOrder.mutate({ id: row.id, data: {} })}>Hủy</Button>}
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      <VasWorkOrderFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        isLoading={createWorkOrder.isPending}
        warehouses={warehouses}
        owners={owners}
        items={items}
      />
    </>
  )
}
