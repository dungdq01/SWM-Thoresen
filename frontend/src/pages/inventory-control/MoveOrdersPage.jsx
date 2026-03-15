import { useState } from 'react'
import { useMoveOrders, useCreateMoveOrder, useConfirmMoveOrder, useExecuteMoveOrder, useCancelMoveOrder } from '@domains/inventory-control'
import { useLookupItems, useLookupOwners, useLookupWarehouses, useLookupLocations } from '@domains/master-data'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'
import { MoveOrderFormDrawer } from '@features/inventory-control'

const statusTone = (status) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'CANCELLED' || status === 'FAILED') return 'danger'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'CONFIRMED') return 'info'
  return 'default'
}

export function MoveOrdersPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', warehouseId: '' })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeWarehouseId, setActiveWarehouseId] = useState('')

  const { data: response, isLoading, refetch } = useMoveOrders(filters)
  const createMoveOrder = useCreateMoveOrder()
  const confirmMoveOrder = useConfirmMoveOrder()
  const executeMoveOrder = useExecuteMoveOrder()
  const cancelMoveOrder = useCancelMoveOrder()

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: locations = [] } = useLookupLocations(activeWarehouseId)

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleSubmit = async (payload) => {
    setActiveWarehouseId(payload.warehouseId)
    await createMoveOrder.mutateAsync(payload)
    setDrawerOpen(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Lệnh di chuyển nội bộ</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => setDrawerOpen(true)}>Tạo lệnh di chuyển</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'DRAFT' }, { value: 'CONFIRMED', label: 'CONFIRMED' }, { value: 'IN_PROGRESS', label: 'IN_PROGRESS' }, { value: 'COMPLETED', label: 'COMPLETED' }, { value: 'CANCELLED', label: 'CANCELLED' }]} placeholder="Trạng thái" />
          <Select value={filters.warehouseId} onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} placeholder="Kho" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Số lệnh</TableHead>
              <TableHead>Kho / Lý do</TableHead>
              <TableHead align="right">Dòng / SL</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={5} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="Chưa có lệnh di chuyển nào" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.moveNumber}</p>
                  <p className="text-xs text-navy-400">{row.executionMode}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.warehouse?.code || row.warehouseId}</p>
                  <p className="text-xs text-navy-400">{row.reasonCode || 'N/A'}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.lines?.length || 0} dòng</p>
                  <p className="text-xs text-navy-400">{row.lines?.reduce((sum, l) => sum + (l.requestedQty || 0), 0).toLocaleString()} kg</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'DRAFT' && <Button variant="outline" size="sm" onClick={() => confirmMoveOrder.mutate(row.id)}>Xác nhận</Button>}
                    {row.status === 'CONFIRMED' && <Button variant="accent" size="sm" onClick={() => executeMoveOrder.mutate(row.id)}>Thực hiện</Button>}
                    {['DRAFT', 'CONFIRMED'].includes(row.status) && <Button variant="ghost" size="sm" onClick={() => cancelMoveOrder.mutate({ id: row.id, data: { reasonCode: 'CANCELLED' } })}>Hủy</Button>}
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      <MoveOrderFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        isLoading={createMoveOrder.isPending}
        warehouses={warehouses}
        items={items}
        owners={owners}
        locations={locations}
      />
    </>
  )
}
