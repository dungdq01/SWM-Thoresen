import { useCallback, useMemo, useState } from 'react'
import { Boxes, ShieldCheck, ShieldOff, Truck } from 'lucide-react'
import { useCancelHold, useCreateHold, useHoldList, useReleaseHold } from '@domains/inventory-core'
import { useLookupItems, useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Input, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Pagination } from '@shared/ui'

const holdTone = (status) => {
  if (status === 'ACTIVE') return 'success'
  if (status === 'PARTIALLY_RELEASED' || status === 'RELEASED') return 'warning'
  if (status === 'CANCELLED') return 'danger'
  return 'default'
}

export function InventoryHoldsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, itemId: '', ownerId: '', shipmentId: '', status: '' })
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
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h2 className="section-title">Hold allocation</h2>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới dữ liệu</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="wrs-card p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <select className="wrs-input" value={filters.itemId} onChange={(e) => handleFilterChange('itemId', e.target.value)}>
              <option value="">Tất cả item</option>
              {itemOptions.map((option) => <option key={option.id} value={option.id}>{option.code}</option>)}
            </select>
            <select className="wrs-input" value={filters.ownerId} onChange={(e) => handleFilterChange('ownerId', e.target.value)}>
              <option value="">Tất cả owner</option>
              {ownerOptions.map((option) => <option key={option.id} value={option.id}>{option.code}</option>)}
            </select>
            <Input placeholder="Shipment ID" value={filters.shipmentId} onChange={(e) => handleFilterChange('shipmentId', e.target.value)} />
            <select className="wrs-input" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PARTIALLY_RELEASED">PARTIALLY_RELEASED</option>
              <option value="RELEASED">RELEASED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow hoverable={false}>
                <TableHead>Hold</TableHead>
                <TableHead>Shipment</TableHead>
                <TableHead>Item / Owner</TableHead>
                <TableHead align="right">Qty</TableHead>
                <TableHead align="center">Trạng thái</TableHead>
                <TableHead align="center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableLoading colSpan={6} /> : null}
              {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Chưa có hold nào" /> : null}
              {!isLoading ? rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-navy-900">{row.holdNo || row.id}</p>
                      <p className="text-xs text-navy-400">{row.correlationId || 'Không có correlation'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-800">{row.shipmentId || 'Manual'}</p>
                    <p className="text-xs text-navy-400">{row.shipmentLineId || '—'}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-900">{row.item?.itemCode || row.itemId}</p>
                    <p className="text-xs text-navy-400">{row.owner?.ownerCode || row.dim?.ownerCode || '—'}</p>
                  </TableCell>
                  <TableCell align="right" className="font-semibold text-navy-900">{row.holdQty || row.qty}</TableCell>
                  <TableCell align="center"><Badge variant={holdTone(row.status)}>{row.status || 'ACTIVE'}</Badge></TableCell>
                  <TableCell align="center">
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => releaseHold.mutate({ holdId: row.id, data: { releaseQty: row.holdQty || row.qty, correlationId: `corr-release-${Date.now()}` } })}>Release</Button>
                      <Button variant="ghost" size="sm" onClick={() => cancelHold.mutate({ holdId: row.id, data: { correlationId: `corr-cancel-${Date.now()}` } })}>Cancel</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : null}
            </TableBody>
          </Table>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => handleFilterChange('page', page)} />
        </div>

        <div className="wrs-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-navy-900">Tạo hold nhanh</h3>
            <p className="text-sm text-navy-400">Mô phỏng flow allocation từ outbound để reserve stock ở status `AVAILABLE`.</p>
          </div>
          <Input label="Shipment ID" value={draft.shipmentId} onChange={(e) => handleDraftChange('shipmentId', e.target.value)} />
          <Input label="Shipment line ID" value={draft.shipmentLineId} onChange={(e) => handleDraftChange('shipmentLineId', e.target.value)} />
          <select className="wrs-input" value={draft.itemId} onChange={(e) => handleDraftChange('itemId', e.target.value)}>
            <option value="">Chọn item</option>
            {itemOptions.map((option) => <option key={option.id} value={option.id}>{option.code} - {option.name}</option>)}
          </select>
          <Input label="Số lượng hold" value={draft.qty} onChange={(e) => handleDraftChange('qty', e.target.value)} />
          <select className="wrs-input" value={draft.warehouseCode} onChange={(e) => handleDraftChange('warehouseCode', e.target.value)}>
            <option value="">Chọn kho</option>
            {warehouseOptions.map((option) => <option key={option.id} value={option.code}>{option.code} - {option.name}</option>)}
          </select>
          <Input label="Location code" value={draft.locationCode} onChange={(e) => handleDraftChange('locationCode', e.target.value)} />
          <Input label="Owner code" value={draft.ownerCode} onChange={(e) => handleDraftChange('ownerCode', e.target.value)} />
          <Input label="Status code" value={draft.statusCode} onChange={(e) => handleDraftChange('statusCode', e.target.value)} />
          <Button variant="gold" onClick={handleCreateHold} disabled={createHold.isPending}>Tạo hold</Button>
        </div>
      </div>
    </div>
  )
}
