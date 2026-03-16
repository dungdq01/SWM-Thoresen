import { useCallback, useState } from 'react'
import { useCancelHold, useHoldList, useReleaseHold } from '@domains/inventory-core'
import { useLookupItems, useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Input, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Pagination } from '@shared/ui'
import { InventoryHoldFormDrawer } from '@features/inventory-core'

const holdTone = (status) => {
  if (status === 'ACTIVE') return 'success'
  if (status === 'PARTIALLY_RELEASED' || status === 'RELEASED') return 'warning'
  if (status === 'CANCELLED') return 'danger'
  return 'default'
}

const HOLD_STATUS_LABELS = {
  ACTIVE: 'Đang giữ',
  PARTIALLY_RELEASED: 'Giải phóng một phần',
  RELEASED: 'Đã giải phóng',
  CONSUMED: 'Đã tiêu thụ',
  CANCELLED: 'Đã hủy',
}

export function InventoryHoldsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, itemId: '', ownerId: '', shipmentId: '', status: '', warehouseId: '' })
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: response, isLoading, refetch } = useHoldList({
    ...filters,
    itemId: filters.itemId || undefined,
    ownerId: filters.ownerId || undefined,
    shipmentId: filters.shipmentId || undefined,
    status: filters.status || undefined,
    warehouseId: filters.warehouseId || undefined,
  })

  const releaseHold = useReleaseHold()
  const cancelHold = useCancelHold()
  const { data: itemOptions = [] } = useLookupItems()
  const { data: ownerOptions = [] } = useLookupOwners()
  const { data: warehouseOptions = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }, [])

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Quản lý giữ hàng</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
          <Button variant="accent" size="sm" onClick={() => setDrawerOpen(true)}>+ Tạo giữ hàng</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Quick status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {[{ value: '', label: 'Tất cả' }, { value: 'ACTIVE', label: 'Đang giữ' }, { value: 'PARTIALLY_RELEASED', label: 'Giải phóng một phần' }, { value: 'RELEASED', label: 'Đã giải phóng' }, { value: 'CANCELLED', label: 'Đã hủy' }, { value: 'CONSUMED', label: 'Đã tiêu thụ' }].map((s) => (
            <button
              key={s.value}
              onClick={() => handleFilterChange('status', s.value)}
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

        {/* Other filters */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select value={filters.itemId} onChange={(e) => handleFilterChange('itemId', e.target.value)} placeholder="Tất cả mặt hàng"
            options={itemOptions.map((o) => ({ value: o.id, label: o.code }))} />
          <Select value={filters.ownerId} onChange={(e) => handleFilterChange('ownerId', e.target.value)} placeholder="Tất cả chủ hàng"
            options={ownerOptions.map((o) => ({ value: o.id, label: o.code }))} />
          <Select value={filters.warehouseId} onChange={(e) => handleFilterChange('warehouseId', e.target.value)} placeholder="Tất cả kho"
            options={warehouseOptions.map((o) => ({ value: o.id, label: `${o.code} — ${o.name}` }))} />
          <Input placeholder="Mã phiếu xuất" value={filters.shipmentId} onChange={(e) => handleFilterChange('shipmentId', e.target.value)} />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã giữ hàng</TableHead>
              <TableHead>Phiếu xuất</TableHead>
              <TableHead>Mặt hàng / Chủ hàng</TableHead>
              <TableHead>Kho / Vị trí</TableHead>
              <TableHead align="right">Số lượng</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={7} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={7} message="Không có dữ liệu giữ hàng" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.holdNo || row.id}</p>
                    <p className="text-xs text-navy-400">{row.correlationId || 'Không có mã liên kết'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.shipmentId || 'Thủ công'}</p>
                  <p className="text-xs text-navy-400">{row.shipmentLineId || '—'}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-900">{row.item?.itemCode || row.itemId}</p>
                  <p className="text-xs text-navy-400">{row.inventDim?.owner?.ownerCode || '—'}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.inventDim?.warehouse?.warehouseCode || '—'}</p>
                  <p className="text-xs text-navy-400">{row.inventDim?.location?.locationCode || '—'}</p>
                </TableCell>
                <TableCell align="right" className="font-semibold text-navy-900">{row.holdQty || row.qty}</TableCell>
                <TableCell align="center"><Badge variant={holdTone(row.status)}>{HOLD_STATUS_LABELS[row.status] || row.status || 'Đang giữ'}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => releaseHold.mutate({ holdId: row.id, data: { releaseQty: row.holdQty || row.qty, correlationId: `corr-release-${Date.now()}` } })}>Giải phóng</Button>
                    <Button variant="ghost" size="sm" onClick={() => cancelHold.mutate({ holdId: row.id, data: { correlationId: `corr-cancel-${Date.now()}` } })}>Hủy</Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => handleFilterChange('page', page)} />
      </div>

      <InventoryHoldFormDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); refetch() }}
      />
    </>
  )
}
