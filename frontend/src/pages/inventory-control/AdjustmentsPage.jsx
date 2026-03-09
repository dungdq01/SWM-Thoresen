import { useState } from 'react'
import { useAdjustments, useCreateAdjustment, useSubmitAdjustment, useApproveAdjustment, usePostAdjustment } from '@domains/inventory-control'
import { useLookupItems, useLookupOwners, useLookupWarehouses, useLookupLocations } from '@domains/master-data'
import { Badge, Button, Input, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Textarea } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'POSTED') return 'success'
  if (['CANCELLED', 'FAILED', 'REJECTED'].includes(status)) return 'danger'
  if (['PENDING_APPROVAL', 'APPROVED'].includes(status)) return 'warning'
  return 'default'
}

const initialDraft = {
  warehouseId: '',
  sourceType: 'MANUAL',
  lines: [{ locationId: '', itemId: '', ownerId: '', adjustQty: '', reasonCode: '', note: '' }],
}

export function AdjustmentsPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', sourceType: '' })
  const [draft, setDraft] = useState(initialDraft)
  const [errors, setErrors] = useState({})

  const { data: response, isLoading, refetch } = useAdjustments(filters)
  const createAdjustment = useCreateAdjustment()
  const submitAdjustment = useSubmitAdjustment()
  const approveAdjustment = useApproveAdjustment()
  const postAdjustment = usePostAdjustment()

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: locations = [] } = useLookupLocations()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const validate = () => {
    const e = {}
    if (!draft.warehouseId) e.warehouseId = 'Warehouse là bắt buộc'
    if (!draft.lines[0].locationId) e.locationId = 'Location là bắt buộc'
    if (!draft.lines[0].itemId) e.itemId = 'Item là bắt buộc'
    if (!draft.lines[0].ownerId) e.ownerId = 'Owner là bắt buộc'
    if (!draft.lines[0].adjustQty || Number(draft.lines[0].adjustQty) === 0) e.adjustQty = 'Adjust Qty không được bằng 0'
    if (!draft.lines[0].reasonCode) e.reasonCode = 'Reason Code là bắt buộc'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    await createAdjustment.mutateAsync(draft)
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
        <h2 className="section-title">Inventory Adjustments</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="wrs-card p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'DRAFT' }, { value: 'PENDING_APPROVAL', label: 'PENDING_APPROVAL' }, { value: 'APPROVED', label: 'APPROVED' }, { value: 'POSTED', label: 'POSTED' }]} placeholder="Status" />
            <Select value={filters.sourceType} onChange={(e) => setFilters((prev) => ({ ...prev, sourceType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'MANUAL', label: 'MANUAL' }, { value: 'CYCLE_COUNT', label: 'CYCLE_COUNT' }, { value: 'RECONCILIATION', label: 'RECONCILIATION' }]} placeholder="Source type" />
          </div>

          <Table>
            <TableHeader>
              <TableRow hoverable={false}>
                <TableHead>Adjustment #</TableHead>
                <TableHead>Warehouse / Source</TableHead>
                <TableHead align="right">Lines / Qty</TableHead>
                <TableHead align="center">Status</TableHead>
                <TableHead align="center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableLoading colSpan={5} /> : null}
              {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="No adjustments available" /> : null}
              {!isLoading ? rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-semibold text-navy-900">{row.adjustmentNumber}</p>
                    <p className="text-xs text-navy-400">{row.sourceRefId || 'N/A'}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-800">{row.warehouse?.code || row.warehouseId}</p>
                    <p className="text-xs text-navy-400">{row.sourceType}</p>
                  </TableCell>
                  <TableCell align="right">
                    <p className="font-semibold text-navy-900">{row.lines?.length || 0} line(s)</p>
                    <p className="text-xs text-navy-400">{row.lines?.reduce((sum, l) => sum + (l.adjustQty || 0), 0).toLocaleString()} kg</p>
                  </TableCell>
                  <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                  <TableCell align="center">
                    <div className="flex justify-center gap-2">
                      {row.status === 'DRAFT' && <Button variant="outline" size="sm" onClick={() => submitAdjustment.mutate(row.id)}>Submit</Button>}
                      {row.status === 'PENDING_APPROVAL' && <Button variant="accent" size="sm" onClick={() => approveAdjustment.mutate(row.id)}>Approve</Button>}
                      {row.status === 'APPROVED' && <Button variant="accent" size="sm" onClick={() => postAdjustment.mutate(row.id)}>Post</Button>}
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
            <h3 className="text-sm font-semibold text-navy-900">Create Adjustment</h3>
            <p className="text-sm text-navy-400">Adjust inventory manually or from cycle count results.</p>
          </div>
          <div>
            <Select label="Warehouse" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))} options={warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))} />
            {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId}</p>}
          </div>

          <div className="border-t border-moon-200 pt-4">
            <p className="text-sm font-semibold text-navy-900 mb-3">Line 1</p>
            <div>
              <Select label="Location" value={draft.lines[0].locationId} onChange={(e) => updateLine(0, 'locationId', e.target.value)} options={locations.map((l) => ({ value: l.id, label: l.code }))} />
              {errors.locationId && <p className="text-xs text-danger mt-1">{errors.locationId}</p>}
            </div>
            <div className="mt-3">
              <Select label="Item" value={draft.lines[0].itemId} onChange={(e) => updateLine(0, 'itemId', e.target.value)} options={items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))} />
              {errors.itemId && <p className="text-xs text-danger mt-1">{errors.itemId}</p>}
            </div>
            <div className="mt-3">
              <Select label="Owner" value={draft.lines[0].ownerId} onChange={(e) => updateLine(0, 'ownerId', e.target.value)} options={owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))} />
              {errors.ownerId && <p className="text-xs text-danger mt-1">{errors.ownerId}</p>}
            </div>
            <div className="mt-3">
              <Input label="Adjust Qty (kg, ± value)" type="number" value={draft.lines[0].adjustQty} onChange={(e) => updateLine(0, 'adjustQty', e.target.value)} />
              {errors.adjustQty && <p className="text-xs text-danger mt-1">{errors.adjustQty}</p>}
            </div>
            <div className="mt-3">
              <Select label="Reason Code" value={draft.lines[0].reasonCode} onChange={(e) => updateLine(0, 'reasonCode', e.target.value)} options={[{ value: 'COUNT_SHORTAGE', label: 'COUNT_SHORTAGE' }, { value: 'COUNT_OVERAGE', label: 'COUNT_OVERAGE' }, { value: 'FOUND_STOCK', label: 'FOUND_STOCK' }, { value: 'DAMAGE_WRITEOFF', label: 'DAMAGE_WRITEOFF' }, { value: 'MANUAL_CORRECTION', label: 'MANUAL_CORRECTION' }]} />
              {errors.reasonCode && <p className="text-xs text-danger mt-1">{errors.reasonCode}</p>}
            </div>
            <Textarea label="Note" rows={2} value={draft.lines[0].note} onChange={(e) => updateLine(0, 'note', e.target.value)} className="mt-3" />
          </div>

          <Button variant="accent" onClick={handleCreate} disabled={createAdjustment.isPending}>Create Adjustment</Button>
        </div>
      </div>
    </div>
  )
}
