import { useState } from 'react'
import { useBillingEvents, useCaptureEvent } from '@domains/billing'
import { useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'
import { BillableEventFormDrawer } from '@features/billing'


const EVENT_TYPE_OPTIONS = [
  { value: 'INBOUND_HANDLING', label: 'Nhập hàng' },
  { value: 'OUTBOUND_HANDLING', label: 'Xuất hàng' },
  { value: 'BAGGING_FEE', label: 'Đóng gói' },
  { value: 'STORAGE', label: 'Lưu trữ' },
]

const eventTypeTone = (eventType) => {
  if (eventType.includes('RECEIPT') || eventType.includes('IN')) return 'success'
  if (eventType.includes('SHIPMENT') || eventType.includes('OUT')) return 'danger'
  if (eventType.includes('VAS')) return 'warning'
  return 'info'
}

export function BillableEventsPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 30, ownerId: '', eventType: '', invoiced: undefined })
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: response, isLoading, refetch } = useBillingEvents(filters)
  const captureEvent = useCaptureEvent()
  const { data: owners = [] } = useLookupOwners()
  const { data: warehouses = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const ownerMap = Object.fromEntries(owners.map(o => [o.id, o]))
  const warehouseMap = Object.fromEntries(warehouses.map(w => [w.id, w]))

  const handleSubmit = async (payload) => {
    await captureEvent.mutateAsync(payload)
    setDrawerOpen(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Sự kiện thanh toán</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => setDrawerOpen(true)}>Tạo Sự kiện</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} placeholder="Chủ sở hữu" />
          <Select value={filters.eventType} onChange={(e) => setFilters((prev) => ({ ...prev, eventType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...EVENT_TYPE_OPTIONS]} placeholder="Loại sự kiện" />
          <Select value={filters.invoiced === undefined ? '' : filters.invoiced.toString()} onChange={(e) => setFilters((prev) => ({ ...prev, invoiced: e.target.value === '' ? undefined : e.target.value === 'true', page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'true', label: 'Đã tính hóa đơn' }, { value: 'false', label: 'Chưa tính hóa đơn' }]} placeholder="Trạng thái thanh toán" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Loại sự kiện</TableHead>
              <TableHead>Nguồn</TableHead>
              <TableHead>Chủ sở hữu / Kho</TableHead>
              <TableHead align="right">Số lượng</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead align="center">Thanh toán</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Không có sự kiện thanh toán" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Badge variant={eventTypeTone(row.eventType)}>{EVENT_TYPE_OPTIONS.find(o => o.value === row.eventType)?.label || row.eventType}</Badge>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.refId || row.sourceId || '-'}</p>
                  <p className="text-xs text-navy-400">{row.sourceModule}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.owner?.name || ownerMap[row.ownerId]?.name || '-'}</p>
                  <p className="text-xs text-navy-400">{row.warehouse?.name || warehouseMap[row.warehouseId]?.name || '-'}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.billingQtyMt?.toLocaleString()} MT</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-navy-500">{row.eventDate ? new Date(row.eventDate).toLocaleDateString('vi-VN') : '-'}</p>
                </TableCell>
                <TableCell align="center">
                  <Badge variant={row.billingStatus === 'BILLED' ? 'success' : 'warning'}>{row.billingStatus === 'BILLED' ? 'Có' : 'Không'}</Badge>
                  {row.debitNoteLineId && <p className="text-xs text-navy-400 mt-1">{row.debitNoteLineId}</p>}
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      <BillableEventFormDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        isLoading={captureEvent.isPending}
        owners={owners}
        warehouses={warehouses}
      />
    </>
  )
}
