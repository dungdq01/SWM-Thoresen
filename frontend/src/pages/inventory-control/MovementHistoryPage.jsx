import { useState } from 'react'
import { useMovementHistory } from '@domains/inventory-control'
import { useLookupItems, useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const transTypeTone = (transType) => {
  if (['RECEIVE', 'TRANSFER_RECEIVE'].includes(transType)) return 'success'
  if (['ISSUE', 'TRANSFER_SHIP'].includes(transType)) return 'danger'
  if (transType === 'ADJUSTMENT') return 'warning'
  if (transType === 'MOVE') return 'info'
  return 'default'
}

export function MovementHistoryPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 30, warehouseId: '', itemId: '', transType: '' })

  const { data: response, isLoading, refetch } = useMovementHistory(filters)

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Lịch sử biến động tồn kho</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select value={filters.warehouseId} onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} placeholder="Kho" />
          <Select value={filters.itemId} onChange={(e) => setFilters((prev) => ({ ...prev, itemId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]} placeholder="Mặt hàng" />
          <Select value={filters.transType} onChange={(e) => setFilters((prev) => ({ ...prev, transType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'RECEIVE', label: 'RECEIVE' }, { value: 'ISSUE', label: 'ISSUE' }, { value: 'MOVE', label: 'MOVE' }, { value: 'TRANSFER_SHIP', label: 'TRANSFER_SHIP' }, { value: 'TRANSFER_RECEIVE', label: 'TRANSFER_RECEIVE' }, { value: 'ADJUSTMENT', label: 'ADJUSTMENT' }]} placeholder="Loại giao dịch" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Loại GD</TableHead>
              <TableHead>Tham chiếu</TableHead>
              <TableHead>Hàng hóa / Chủ hàng</TableHead>
              <TableHead>Vị trí</TableHead>
              <TableHead align="right">Số lượng</TableHead>
              <TableHead>Chiều</TableHead>
              <TableHead>Thời gian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={7} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={7} message="Chưa có lịch sử biến động nào" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Badge variant={transTypeTone(row.transType)}>{row.transType}</Badge>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.refType}</p>
                  <p className="text-xs text-navy-400">{row.refId}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.item?.code || row.itemId}</p>
                  <p className="text-xs text-navy-400">{row.owner?.code || row.ownerId}</p>
                </TableCell>
                <TableCell>
                  <p className="text-navy-800">{row.location?.code || row.locationId}</p>
                </TableCell>
                <TableCell align="right">
                  <p className={`font-semibold ${row.direction === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {row.direction === 'IN' ? '+' : ''}{row.qty?.toLocaleString()} {row.uom}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={row.direction === 'IN' ? 'success' : 'danger'}>{row.direction}</Badge>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-navy-400">{new Date(row.transAt).toLocaleString('vi-VN')}</p>
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
