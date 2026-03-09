import { useState } from 'react'
import { useBillableEvents } from '@domains/billing'
import { useLookupOwners } from '@domains/master-data'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const eventTypeTone = (eventType) => {
  if (eventType.includes('RECEIPT') || eventType.includes('IN')) return 'success'
  if (eventType.includes('SHIPMENT') || eventType.includes('OUT')) return 'danger'
  if (eventType.includes('VAS')) return 'warning'
  return 'info'
}

export function BillableEventsPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 30, ownerId: '', eventType: '', invoiced: undefined })

  const { data: response, isLoading, refetch } = useBillableEvents(filters)
  const { data: owners = [] } = useLookupOwners()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Sự kiện tính phí</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} placeholder="Owner" />
          <Select value={filters.eventType} onChange={(e) => setFilters((prev) => ({ ...prev, eventType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'RECEIPT_RECEIVED', label: 'RECEIPT_RECEIVED' }, { value: 'SHIPMENT_SHIPPED', label: 'SHIPMENT_SHIPPED' }, { value: 'VAS_COMPLETED', label: 'VAS_COMPLETED' }, { value: 'STORAGE_DAILY', label: 'STORAGE_DAILY' }]} placeholder="Event Type" />
          <Select value={filters.invoiced === undefined ? '' : filters.invoiced.toString()} onChange={(e) => setFilters((prev) => ({ ...prev, invoiced: e.target.value === '' ? undefined : e.target.value === 'true', page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'true', label: 'Đã xuất HĐ' }, { value: 'false', label: 'Chưa xuất HĐ' }]} placeholder="Invoiced Status" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Loại sự kiện</TableHead>
              <TableHead>Nguồn</TableHead>
              <TableHead>Chủ hàng / Kho</TableHead>
              <TableHead align="right">SL</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead align="center">Xuất HĐ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Chưa có sự kiện tính phí" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Badge variant={eventTypeTone(row.eventType)}>{row.eventType}</Badge>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.sourceId}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.owner?.code || row.ownerId}</p>
                  <p className="text-xs text-navy-400">{row.warehouse?.code || row.warehouseId}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.qty?.toLocaleString()} {row.uom}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-navy-500">{new Date(row.eventAt).toLocaleString('vi-VN')}</p>
                </TableCell>
                <TableCell align="center">
                  <Badge variant={row.invoiced ? 'success' : 'warning'}>{row.invoiced ? 'Rồi' : 'Chưa'}</Badge>
                  {row.invoiceId && <p className="text-xs text-navy-400 mt-1">{row.invoiceId}</p>}
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>
    </div>
  )
}
