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
        <h2 className="section-title">Hold allocation</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
          <Button variant="accent" size="sm" onClick={() => setShowCreate(true)}>+ Create Hold</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <select className="wrs-input" value={filters.itemId} onChange={(e) => handleFilterChange('itemId', e.target.value)}>
            <option value="">All items</option>
            {itemOptions.map((option) => <option key={option.id} value={option.id}>{option.code}</option>)}
          </select>
          <select className="wrs-input" value={filters.ownerId} onChange={(e) => handleFilterChange('ownerId', e.target.value)}>
            <option value="">All owners</option>
            {ownerOptions.map((option) => <option key={option.id} value={option.id}>{option.code}</option>)}
          </select>
          <Input placeholder="Shipment ID" value={filters.shipmentId} onChange={(e) => handleFilterChange('shipmentId', e.target.value)} />
          <select className="wrs-input" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
            <option value="">All statuses</option>
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
              <TableHead align="center">Status</TableHead>
              <TableHead align="center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="No holds available" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.holdNo || row.id}</p>
                    <p className="text-xs text-navy-400">{row.correlationId || 'No correlation'}</p>
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

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Quick Hold Creation"
        description="Simulate allocation flow from outbound to reserve stock at AVAILABLE status."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="accent" onClick={handleCreateHold} disabled={createHold.isPending}>
              {createHold.isPending ? 'Creating...' : 'Create Hold'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Shipment ID" value={draft.shipmentId} onChange={(e) => handleDraftChange('shipmentId', e.target.value)} />
            <Input label="Shipment line ID" value={draft.shipmentLineId} onChange={(e) => handleDraftChange('shipmentLineId', e.target.value)} />
          </div>
          <select className="wrs-input" value={draft.itemId} onChange={(e) => handleDraftChange('itemId', e.target.value)}>
            <option value="">Select item</option>
            {itemOptions.map((option) => <option key={option.id} value={option.id}>{option.code} - {option.name}</option>)}
          </select>
          <Input label="Hold quantity" value={draft.qty} onChange={(e) => handleDraftChange('qty', e.target.value)} />
          <select className="wrs-input" value={draft.warehouseCode} onChange={(e) => handleDraftChange('warehouseCode', e.target.value)}>
            <option value="">Select warehouse</option>
            {warehouseOptions.map((option) => <option key={option.id} value={option.code}>{option.code} - {option.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Location code" value={draft.locationCode} onChange={(e) => handleDraftChange('locationCode', e.target.value)} />
            <Input label="Owner code" value={draft.ownerCode} onChange={(e) => handleDraftChange('ownerCode', e.target.value)} />
          </div>
          <Input label="Status code" value={draft.statusCode} onChange={(e) => handleDraftChange('statusCode', e.target.value)} />
        </div>
      </Modal>
    </>
  )
}
