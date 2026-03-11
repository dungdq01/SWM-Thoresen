import { useCallback, useState } from 'react'
import { useCancelHold, useCreateHold, useHoldList, useReleaseHold } from '@domains/inventory-core'
import { useLookupItems, useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Input, Modal, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Pagination } from '@shared/ui'

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
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, itemId: '', ownerId: '', shipmentId: '', status: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState({ shipmentId: '', shipmentLineId: '', itemId: '', qty: '', warehouseCode: '', locationCode: '', ownerCode: '', statusCode: 'AVAILABLE' })

  const { data: response, isLoading, refetch } = useHoldList({
    ...filters,
    itemId: filters.itemId || undefined,
    ownerId: filters.ownerId || undefined,
    shipmentId: filters.shipmentId || undefined,
    status: filters.status || undefined,
  })

  const createHold = useCreateHold()
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

  const handleDraftChange = useCallback((key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleCreateHold = async () => {
    await createHold.mutateAsync({
      externalId: `hold-${draft.shipmentId || 'manual'}-${Date.now()}`,
      correlationId: `corr-hold-${Date.now()}`,
      shipmentId: draft.shipmentId,
      shipmentLineId: draft.shipmentLineId,
      itemId: draft.itemId,
      qty: draft.qty,
      dim: {
        warehouseCode: draft.warehouseCode,
        locationCode: draft.locationCode,
        ownerCode: draft.ownerCode,
        statusCode: draft.statusCode,
      },
    })
    setShowCreate(false)
    refetch()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Quản lý giữ hàng</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
          <Button variant="accent" size="sm" onClick={() => setShowCreate(true)}>+ Tạo giữ hàng</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <select className="wrs-input" value={filters.itemId} onChange={(e) => handleFilterChange('itemId', e.target.value)}>
            <option value="">Tất cả mặt hàng</option>
            {itemOptions.map((option) => <option key={option.id} value={option.id}>{option.code}</option>)}
          </select>
          <select className="wrs-input" value={filters.ownerId} onChange={(e) => handleFilterChange('ownerId', e.target.value)}>
            <option value="">Tất cả chủ hàng</option>
            {ownerOptions.map((option) => <option key={option.id} value={option.id}>{option.code}</option>)}
          </select>
          <Input placeholder="Mã phiếu xuất" value={filters.shipmentId} onChange={(e) => handleFilterChange('shipmentId', e.target.value)} />
          <select className="wrs-input" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang giữ</option>
            <option value="PARTIALLY_RELEASED">Giải phóng một phần</option>
            <option value="RELEASED">Đã giải phóng</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã giữ hàng</TableHead>
              <TableHead>Phiếu xuất</TableHead>
              <TableHead>Mặt hàng / Chủ hàng</TableHead>
              <TableHead align="right">Số lượng</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Không có dữ liệu giữ hàng" /> : null}
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
                  <p className="text-xs text-navy-400">{row.owner?.ownerCode || row.dim?.ownerCode || '—'}</p>
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

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tạo giữ hàng"
        description="Tạo yêu cầu giữ hàng để đặt trước tồn kho cho phiếu xuất."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreateHold} disabled={createHold.isPending}>
              {createHold.isPending ? 'Đang tạo...' : 'Tạo giữ hàng'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Mã phiếu xuất" value={draft.shipmentId} onChange={(e) => handleDraftChange('shipmentId', e.target.value)} />
            <Input label="Mã dòng phiếu xuất" value={draft.shipmentLineId} onChange={(e) => handleDraftChange('shipmentLineId', e.target.value)} />
          </div>
          <select className="wrs-input" value={draft.itemId} onChange={(e) => handleDraftChange('itemId', e.target.value)}>
            <option value="">Chọn mặt hàng</option>
            {itemOptions.map((option) => <option key={option.id} value={option.id}>{option.code} - {option.name}</option>)}
          </select>
          <Input label="Số lượng giữ" value={draft.qty} onChange={(e) => handleDraftChange('qty', e.target.value)} />
          <select className="wrs-input" value={draft.warehouseCode} onChange={(e) => handleDraftChange('warehouseCode', e.target.value)}>
            <option value="">Chọn kho</option>
            {warehouseOptions.map((option) => <option key={option.id} value={option.code}>{option.code} - {option.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Mã vị trí" value={draft.locationCode} onChange={(e) => handleDraftChange('locationCode', e.target.value)} />
            <Input label="Mã chủ hàng" value={draft.ownerCode} onChange={(e) => handleDraftChange('ownerCode', e.target.value)} />
          </div>
          <Input label="Mã trạng thái" value={draft.statusCode} onChange={(e) => handleDraftChange('statusCode', e.target.value)} />
        </div>
      </Modal>
    </>
  )
}
