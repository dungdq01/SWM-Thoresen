import { useState } from 'react'
import { useCycleCounts, useCreateCycleCount, useReleaseCycleCount, useApproveCycleCount, usePostCycleCount } from '@domains/inventory-control'
import { useLookupWarehouses, useLookupItems, useLookupOwners, useLookupLocations } from '@domains/master-data'
import { Badge, Button, Input, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'POSTED') return 'success'
  if (['CANCELLED', 'FAILED'].includes(status)) return 'danger'
  if (['UNDER_REVIEW', 'APPROVED'].includes(status)) return 'warning'
  if (['RELEASED', 'COUNTING'].includes(status)) return 'info'
  return 'default'
}

const varianceTone = (pct) => {
  if (pct === null || pct === undefined) return 'default'
  if (Math.abs(pct) <= 0.5) return 'success'
  if (Math.abs(pct) <= 2) return 'warning'
  return 'danger'
}

const initialDraft = {
  warehouseId: '',
  countType: 'SPOT',
  blindCount: true,
  lines: [{ locationId: '', itemId: '', ownerId: '', snapshotQty: '' }],
}

export function CycleCountPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', warehouseId: '' })
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState(initialDraft)
  const [errors, setErrors] = useState({})

  const { data: response, isLoading, refetch } = useCycleCounts(filters)
  const createCycleCount = useCreateCycleCount()
  const releaseCycleCount = useReleaseCycleCount()
  const approveCycleCount = useApproveCycleCount()
  const postCycleCount = usePostCycleCount()

  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: items = [] } = useLookupItems()
  const { data: owners = [] } = useLookupOwners()
  const { data: locations = [] } = useLookupLocations()

  const validate = () => {
    const e = {}
    if (!draft.warehouseId) e.warehouseId = 'Warehouse là bắt buộc'
    if (!draft.lines[0].itemId) e.itemId = 'Item là bắt buộc'
    if (!draft.lines[0].locationId) e.locationId = 'Location là bắt buộc'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    const payload = {
      ...draft,
      lines: draft.lines.map((l) => ({ ...l, snapshotQty: Number(l.snapshotQty) || 0 })),
    }
    await createCycleCount.mutateAsync(payload)
    setDraft(initialDraft)
    setErrors({})
  }

  const updateLine = (field, value) => {
    setDraft((prev) => ({ ...prev, lines: [{ ...prev.lines[0], [field]: value }] }))
  }

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }
  const selected = rows.find((r) => r.id === selectedId) || rows[0]

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Cycle Count</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="wrs-card p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'CREATED', label: 'CREATED' }, { value: 'RELEASED', label: 'RELEASED' }, { value: 'COUNTING', label: 'COUNTING' }, { value: 'UNDER_REVIEW', label: 'UNDER_REVIEW' }, { value: 'APPROVED', label: 'APPROVED' }, { value: 'POSTED', label: 'POSTED' }]} placeholder="Status" />
            <Select value={filters.warehouseId} onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} placeholder="Warehouse" />
          </div>

          <Table>
            <TableHeader>
              <TableRow hoverable={false}>
                <TableHead>Count #</TableHead>
                <TableHead>Type / Warehouse</TableHead>
                <TableHead align="right">Lines</TableHead>
                <TableHead align="center">Status</TableHead>
                <TableHead align="center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableLoading colSpan={5} /> : null}
              {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="No cycle counts available" /> : null}
              {!isLoading ? rows.map((row) => (
                <TableRow key={row.id} onClick={() => setSelectedId(row.id)} className={selected?.id === row.id ? 'bg-muted/60' : ''}>
                  <TableCell>
                    <p className="font-semibold text-navy-900">{row.countNumber}</p>
                    <p className="text-xs text-navy-400">{row.blindCount ? 'Blind' : 'Open'}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-800">{row.countType}</p>
                    <p className="text-xs text-navy-400">{row.warehouse?.code || row.warehouseId}</p>
                  </TableCell>
                  <TableCell align="right">
                    <p className="font-semibold text-navy-900">{row.lines?.length || 0}</p>
                  </TableCell>
                  <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                  <TableCell align="center">
                    <div className="flex justify-center gap-2">
                      {row.status === 'CREATED' && <Button variant="outline" size="sm" onClick={() => releaseCycleCount.mutate(row.id)}>Release</Button>}
                      {row.status === 'UNDER_REVIEW' && <Button variant="accent" size="sm" onClick={() => approveCycleCount.mutate(row.id)}>Approve</Button>}
                      {row.status === 'APPROVED' && <Button variant="accent" size="sm" onClick={() => postCycleCount.mutate(row.id)}>Post</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              )) : null}
            </TableBody>
          </Table>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
        </div>

        <div className="space-y-5">
          <div className="wrs-card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-navy-900">Create Cycle Count</h3>
              <p className="text-sm text-navy-400">Tạo phiếu kiểm kê mới theo kho và loại kiểm.</p>
            </div>
            <div>
              <Select label="Warehouse" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn Warehouse --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
              {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId}</p>}
            </div>
            <Select label="Count Type" value={draft.countType} onChange={(e) => setDraft((prev) => ({ ...prev, countType: e.target.value }))} options={[{ value: 'SPOT', label: 'SPOT' }, { value: 'FULL', label: 'FULL' }, { value: 'SAMPLE', label: 'SAMPLE' }]} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="blindCount" checked={draft.blindCount} onChange={(e) => setDraft((prev) => ({ ...prev, blindCount: e.target.checked }))} className="w-4 h-4 accent-accent" />
              <label htmlFor="blindCount" className="text-sm text-navy-700">Blind Count (ẩn số lượng tồn kho)</label>
            </div>
            <div className="border-t border-moon-200 pt-3">
              <p className="text-sm font-semibold text-navy-900 mb-2">Line 1</p>
              <div className="space-y-2">
                <div>
                  <Select label="Location" value={draft.lines[0].locationId} onChange={(e) => updateLine('locationId', e.target.value)} options={[{ value: '', label: '-- Chọn Location --' }, ...locations.map((l) => ({ value: l.id, label: l.code }))]} />
                  {errors.locationId && <p className="text-xs text-danger mt-1">{errors.locationId}</p>}
                </div>
                <div>
                  <Select label="Item" value={draft.lines[0].itemId} onChange={(e) => updateLine('itemId', e.target.value)} options={[{ value: '', label: '-- Chọn Item --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]} />
                  {errors.itemId && <p className="text-xs text-danger mt-1">{errors.itemId}</p>}
                </div>
                <Select label="Owner" value={draft.lines[0].ownerId} onChange={(e) => updateLine('ownerId', e.target.value)} options={[{ value: '', label: '-- Chọn Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
                <Input label="Snapshot Qty (kg)" type="number" value={draft.lines[0].snapshotQty} onChange={(e) => updateLine('snapshotQty', e.target.value)} />
              </div>
            </div>
            <Button variant="accent" onClick={handleCreate} disabled={createCycleCount.isPending}>Create Cycle Count</Button>
          </div>

          <div className="wrs-card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-navy-900">Selected Cycle Count</h3>
              <p className="text-sm text-navy-400">{selected?.countNumber || 'Select a cycle count'}</p>
            </div>
            {selected ? (
              <div className="rounded-xl border border-moon-300 bg-moon-50/70 p-4 text-sm text-navy-700 space-y-1">
                <p><strong>Status:</strong> {selected.status}</p>
                <p><strong>Type:</strong> {selected.countType}</p>
                <p><strong>Warehouse:</strong> {selected.warehouse?.code || selected.warehouseId}</p>
                <p><strong>Created by:</strong> {selected.createdBy}</p>
                <p><strong>Lines:</strong> {selected.lines?.length || 0}</p>
              </div>
            ) : null}
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Count Lines & Variance</h3>
            {selected?.lines?.map((line) => (
              <div key={line.id} className="rounded-xl border border-moon-200 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-navy-800">Line {line.lineNo}: {line.item?.code || line.itemId}</p>
                  <Badge variant={varianceTone(line.variancePct)}>{line.variancePct !== null ? `${line.variancePct}%` : 'Pending'}</Badge>
                </div>
                <p className="text-xs text-navy-500">Location: {line.location?.code || line.locationId}</p>
                <p className="text-xs text-navy-500">Snapshot: {line.snapshotQty?.toLocaleString()} kg · Counted: {line.countedQty?.toLocaleString() ?? '—'} kg</p>
                <p className="text-xs text-navy-500">Variance: {line.varianceQty?.toLocaleString() ?? '—'} kg · Issue: {line.issueCode || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
