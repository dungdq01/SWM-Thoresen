import { useState } from 'react'
import { useMoveOrders, useCreateMoveOrder, useConfirmMoveOrder, useExecuteMoveOrder, useCancelMoveOrder } from '@domains/inventory-control'
import { useLookupItems, useLookupOwners, useLookupWarehouses, useLookupLocations } from '@domains/master-data'
import { Badge, Button, Input, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'CANCELLED' || status === 'FAILED') return 'danger'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'CONFIRMED') return 'info'
  return 'default'
}

const initialDraft = {
  warehouseId: '',
  executionMode: 'DIRECT',
  reasonCode: '',
  lines: [{ itemId: '', ownerId: '', fromLocationId: '', toLocationId: '', requestedQty: '' }],
}

export function MoveOrdersPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', warehouseId: '' })
  const [draft, setDraft] = useState(initialDraft)
  const [errors, setErrors] = useState({})

  const { data: response, isLoading, refetch } = useMoveOrders(filters)
  const createMoveOrder = useCreateMoveOrder()
  const confirmMoveOrder = useConfirmMoveOrder()
  const executeMoveOrder = useExecuteMoveOrder()
  const cancelMoveOrder = useCancelMoveOrder()

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: locations = [] } = useLookupLocations()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const validate = () => {
    const e = {}
    if (!draft.warehouseId) e.warehouseId = 'Warehouse là bắt buộc'
    if (!draft.lines[0].itemId) e.itemId = 'Item là bắt buộc'
    if (!draft.lines[0].fromLocationId) e.fromLocationId = 'From Location là bắt buộc'
    if (!draft.lines[0].toLocationId) e.toLocationId = 'To Location là bắt buộc'
    if (!draft.lines[0].requestedQty || Number(draft.lines[0].requestedQty) <= 0) e.requestedQty = 'Qty phải lớn hơn 0'
    if (draft.lines[0].fromLocationId && draft.lines[0].toLocationId && draft.lines[0].fromLocationId === draft.lines[0].toLocationId) e.toLocationId = 'From và To Location không được giống nhau'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    await createMoveOrder.mutateAsync(draft)
    setDraft(initialDraft)
    setErrors({})
  }

  const updateLine = (index, field, value) => {
    const newLines = [...draft.lines]
    newLines[index] = { ...newLines[index], [field]: value }
    setDraft((prev) => ({ ...prev, lines: newLines }))
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Move Orders (Internal Movement)</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="wrs-card p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'DRAFT' }, { value: 'CONFIRMED', label: 'CONFIRMED' }, { value: 'IN_PROGRESS', label: 'IN_PROGRESS' }, { value: 'COMPLETED', label: 'COMPLETED' }, { value: 'CANCELLED', label: 'CANCELLED' }]} placeholder="Status" />
            <Select value={filters.warehouseId} onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} placeholder="Warehouse" />
          </div>

          <Table>
            <TableHeader>
              <TableRow hoverable={false}>
                <TableHead>Move Order</TableHead>
                <TableHead>Warehouse / Reason</TableHead>
                <TableHead align="right">Lines / Qty</TableHead>
                <TableHead align="center">Status</TableHead>
                <TableHead align="center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableLoading colSpan={5} /> : null}
              {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="No move orders available" /> : null}
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
                    <p className="font-semibold text-navy-900">{row.lines?.length || 0} line(s)</p>
                    <p className="text-xs text-navy-400">{row.lines?.reduce((sum, l) => sum + (l.requestedQty || 0), 0).toLocaleString()} kg</p>
                  </TableCell>
                  <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                  <TableCell align="center">
                    <div className="flex justify-center gap-2">
                      {row.status === 'DRAFT' && <Button variant="outline" size="sm" onClick={() => confirmMoveOrder.mutate(row.id)}>Confirm</Button>}
                      {row.status === 'CONFIRMED' && <Button variant="accent" size="sm" onClick={() => executeMoveOrder.mutate(row.id)}>Execute</Button>}
                      {['DRAFT', 'CONFIRMED'].includes(row.status) && <Button variant="ghost" size="sm" onClick={() => cancelMoveOrder.mutate({ id: row.id, data: { reasonCode: 'CANCELLED' } })}>Cancel</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              )) : null}
            </TableBody>
          </Table>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
        </div>

        <div className="wrs-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-navy-900">Create Move Order</h3>
            <p className="text-sm text-navy-400">Move inventory between locations within the same warehouse.</p>
          </div>
          <div>
            <Select label="Warehouse" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))} options={warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))} />
            {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId}</p>}
          </div>
          <Select label="Reason code" value={draft.reasonCode} onChange={(e) => setDraft((prev) => ({ ...prev, reasonCode: e.target.value }))} options={[{ value: 'CONSOLIDATE', label: 'CONSOLIDATE' }, { value: 'REPLENISH', label: 'REPLENISH' }, { value: 'REORGANIZE', label: 'REORGANIZE' }]} placeholder="Select reason" />

          <div className="border-t border-moon-200 pt-4">
            <p className="text-sm font-semibold text-navy-900 mb-3">Line 1</p>
            <div>
              <Select label="Item" value={draft.lines[0].itemId} onChange={(e) => updateLine(0, 'itemId', e.target.value)} options={items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))} />
              {errors.itemId && <p className="text-xs text-danger mt-1">{errors.itemId}</p>}
            </div>
            <Select label="Owner" value={draft.lines[0].ownerId} onChange={(e) => updateLine(0, 'ownerId', e.target.value)} options={owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))} className="mt-3" />
            <div className="mt-3">
              <Select label="From Location" value={draft.lines[0].fromLocationId} onChange={(e) => updateLine(0, 'fromLocationId', e.target.value)} options={locations.map((l) => ({ value: l.id, label: l.code }))} />
              {errors.fromLocationId && <p className="text-xs text-danger mt-1">{errors.fromLocationId}</p>}
            </div>
            <div className="mt-3">
              <Select label="To Location" value={draft.lines[0].toLocationId} onChange={(e) => updateLine(0, 'toLocationId', e.target.value)} options={locations.map((l) => ({ value: l.id, label: l.code }))} />
              {errors.toLocationId && <p className="text-xs text-danger mt-1">{errors.toLocationId}</p>}
            </div>
            <div className="mt-3">
              <Input label="Qty (kg)" type="number" value={draft.lines[0].requestedQty} onChange={(e) => updateLine(0, 'requestedQty', e.target.value)} />
              {errors.requestedQty && <p className="text-xs text-danger mt-1">{errors.requestedQty}</p>}
            </div>
          </div>

          <Button variant="accent" onClick={handleCreate} disabled={createMoveOrder.isPending}>Create Move Order</Button>
        </div>
      </div>
    </div>
  )
}
