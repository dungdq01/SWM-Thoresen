import { useState } from 'react'
import { useOutboundShipments, useCreateOutboundShipment, useConfirmOutboundShipment, useCancelOutboundShipment } from '@domains/outbound-operations'
import { useLookupItems, useLookupOwners, useLookupWarehouses, useLookupUoms, useCustomerList } from '@domains/master-data'
import { useSalesOrders, useSalesOrderDetail } from '@domains/sales-orders'
import { Badge, Button, Pagination, Select, Input, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'
import { OutboundShipmentFormDrawer } from '@features/outbound-operations'

const SHIPMENT_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'ALLOCATED', label: 'Đã phân bổ' },
  { value: 'PICKING', label: 'Đang lấy hàng' },
  { value: 'WEIGHING_TARE', label: 'Cân bì' },
  { value: 'LOADING', label: 'Đang xếp hàng' },
  { value: 'ALL_WEIGHED', label: 'Đã cân xong' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'SHIPPED', label: 'Đã xuất' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]


const statusTone = (status) => {
  if (['SHIPPED', 'CLOSED'].includes(status)) return 'success'
  if (['CANCELLED'].includes(status)) return 'danger'
  if (['PENDING_APPROVAL'].includes(status)) return 'warning'
  if (['PICKING', 'WEIGHING_TARE', 'LOADING', 'ALL_WEIGHED'].includes(status)) return 'info'
  return 'default'
}

const statusLabel = (status) => {
  const found = SHIPMENT_STATUSES.find((s) => s.value === status)
  return found ? found.label : status
}

export function OutboundShipmentsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, shipmentNumber: '', status: '', ownerId: '' })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSoId, setSelectedSoId] = useState(null)

  const { data: response, isLoading, refetch } = useOutboundShipments({
    ...filters,
    shipmentNumber: filters.shipmentNumber || undefined,
    status: filters.status || undefined,
    ownerId: filters.ownerId || undefined,
  })

  const createShipment = useCreateOutboundShipment()
  const confirmShipment = useConfirmOutboundShipment()
  const cancelShipment = useCancelOutboundShipment()

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: uoms = [] } = useLookupUoms()
  const { data: customerResponse } = useCustomerList({ page: 1, pageSize: 200 })
  const customers = customerResponse?.items || customerResponse?.data || []
  const { data: soResponse } = useSalesOrders({ page: 1, pageSize: 100, status: 'CONFIRMED' })
  const soApiData = soResponse?.data || soResponse || {}
  const salesOrders = soApiData.items || soApiData.data?.items || []
  const { data: soDetailResponse } = useSalesOrderDetail(selectedSoId)
  const soDetail = soDetailResponse?.data || soDetailResponse || null

  const rows = response?.items || response?.data || []
  const pagination = { page: response?.page || 1, totalPages: response?.totalPages || 1 }

  const handleSubmit = async (payload) => {
    await createShipment.mutateAsync(payload)
    setDrawerOpen(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Quản lý chuyến hàng xuất</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setSelectedSoId(null); setDrawerOpen(true) }}>Tạo Shipment</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input placeholder="Tìm mã shipment..." value={filters.shipmentNumber} onChange={(e) => setFilters((prev) => ({ ...prev, shipmentNumber: e.target.value, page: 1 }))} />
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={SHIPMENT_STATUSES} placeholder="Trạng thái" />
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả chủ hàng' }, ...owners.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))]} placeholder="Chủ hàng" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Shipment</TableHead>
              <TableHead>Xe / SO</TableHead>
              <TableHead>Owner / Mặt hàng</TableHead>
              <TableHead align="right">Dự kiến</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Chưa có chuyến hàng nào" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.shipmentNumber || row.id?.slice(0, 8)}</p>
                    <p className="text-xs text-navy-400">{row.lines?.length || row._count?.lines || 0} dòng</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-800">{row.vehicleNumber || 'N/A'}</p>
                    <p className="text-xs text-navy-400">{row.soId || 'Standalone'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-900">{row.owner?.ownerCode || row.owner?.code || row.ownerId}</p>
                    <p className="text-xs text-navy-400">{row.lines?.[0]?.item?.itemCode || row.lines?.[0]?.item?.code || 'N/A'}</p>
                  </div>
                </TableCell>
                <TableCell align="right" className="font-semibold text-navy-900">
                  {(row.lines || []).reduce((sum, l) => sum + (l.expectedQty || 0), 0).toLocaleString()} kg
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{statusLabel(row.status)}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'DRAFT' ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => confirmShipment.mutate(row.id)}>Xác nhận</Button>
                        <Button variant="ghost" size="sm" onClick={() => cancelShipment.mutate({ id: row.id, data: { reasonCode: 'CANCELLED' } })}>Hủy</Button>
                      </>
                    ) : (
                      <span className="text-xs text-navy-400">
                        {row.status === 'CONFIRMED' ? 'Chờ phân bổ' : row.status === 'ALLOCATED' ? 'Chờ lấy hàng' : row.status === 'SHIPPED' ? 'Đã xuất' : 'Đang xử lý'}
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      <OutboundShipmentFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        isLoading={createShipment.isPending}
        owners={owners}
        customers={customers}
        warehouses={warehouses}
        items={items}
        uoms={uoms}
        salesOrders={salesOrders}
        soDetail={soDetail}
        onSoSelect={setSelectedSoId}
      />
    </>
  )
}
