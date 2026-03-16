import { useState } from 'react'
import { useTransferOrders, useCreateTransferOrder, useReleaseTransferOrder, useShipTransferOrder, useReceiveTransferOrder, useCloseTransferOrder, useCancelTransferOrder } from '@domains/inventory-control'
import { useLookupItems, useLookupOwners, useLookupWarehouses, useLookupLocations } from '@domains/master-data'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'
import { TransferOrderFormDrawer } from '@features/inventory-control'

const statusTone = (status) => {
  if (['RECEIVED', 'CLOSED'].includes(status)) return 'success'
  if (['CANCELLED', 'FAILED'].includes(status)) return 'danger'
  if (status === 'IN_TRANSIT') return 'warning'
  if (['RELEASED', 'SHIPPED'].includes(status)) return 'info'
  return 'default'
}

export function TransferOrdersPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '' })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeFromWarehouseId, setActiveFromWarehouseId] = useState('')

  const { data: response, isLoading, refetch } = useTransferOrders(filters)
  const createTransferOrder = useCreateTransferOrder()
  const releaseTransferOrder = useReleaseTransferOrder()
  const shipTransferOrder = useShipTransferOrder()
  const receiveTransferOrder = useReceiveTransferOrder()
  const closeTransferOrder = useCloseTransferOrder()
  const cancelTransferOrder = useCancelTransferOrder()

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: fromLocations = [] } = useLookupLocations(activeFromWarehouseId)

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleSubmit = async (payload) => {
    setActiveFromWarehouseId(payload.fromWarehouseId)
    await createTransferOrder.mutateAsync(payload)
    setDrawerOpen(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Lệnh chuyển kho</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => setDrawerOpen(true)}>Tạo lệnh chuyển kho</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Quick status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {[{ value: '', label: 'Tất cả' }, { value: 'CREATED', label: 'CREATED' }, { value: 'RELEASED', label: 'RELEASED' }, { value: 'SHIPPED', label: 'SHIPPED' }, { value: 'IN_TRANSIT', label: 'IN_TRANSIT' }, { value: 'RECEIVED', label: 'RECEIVED' }, { value: 'CLOSED', label: 'CLOSED' }].map((s) => (
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

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Số lệnh</TableHead>
              <TableHead>Từ → Đến</TableHead>
              <TableHead>Xe</TableHead>
              <TableHead align="right">Số lượng</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Chưa có lệnh chuyển kho nào" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.transferNumber}</p>
                  <p className="text-xs text-navy-400">{row.lines?.length || 0} dòng</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.fromWarehouse?.code || row.fromWarehouseId}</p>
                  <p className="text-xs text-navy-400">→ {row.toWarehouse?.code || row.toWarehouseId}</p>
                </TableCell>
                <TableCell>
                  <p className="text-navy-800">{row.vehicleNumber || 'N/A'}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.lines?.reduce((sum, l) => sum + (l.requestedQty || 0), 0).toLocaleString()} kg</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'CREATED' && <Button variant="outline" size="sm" onClick={() => releaseTransferOrder.mutate(row.id)}>Xuất kho</Button>}
                    {row.status === 'RELEASED' && <Button variant="accent" size="sm" onClick={() => shipTransferOrder.mutate({ id: row.id, data: {} })}>Vận chuyển</Button>}
                    {row.status === 'IN_TRANSIT' && <Button variant="accent" size="sm" onClick={() => receiveTransferOrder.mutate({ id: row.id, data: {} })}>Nhận hàng</Button>}
                    {row.status === 'RECEIVED' && <Button variant="outline" size="sm" onClick={() => closeTransferOrder.mutate({ id: row.id, data: {} })}>Đóng</Button>}
                    {(row.status === 'CREATED' || row.status === 'RELEASED') && <Button variant="ghost" size="sm" onClick={() => cancelTransferOrder.mutate({ id: row.id, data: {} })}>Hủy</Button>}
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      <TransferOrderFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        isLoading={createTransferOrder.isPending}
        warehouses={warehouses}
        items={items}
        owners={owners}
        locations={fromLocations}
      />
    </>
  )
}
