import { useState } from 'react'
import { useCycleCounts, useCreateCycleCount, useReleaseCycleCount, useApproveCycleCount, usePostCycleCount } from '@domains/inventory-control'
import { useLookupWarehouses, useLookupItems, useLookupOwners, useLookupLocations } from '@domains/master-data'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

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
  const [showCreate, setShowCreate] = useState(false)
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
    setShowCreate(false)
  }

  const updateLine = (field, value) => {
    setDraft((prev) => ({ ...prev, lines: [{ ...prev.lines[0], [field]: value }] }))
  }

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }
  const selected = rows.find((r) => r.id === selectedId) || rows[0]

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Kiểm kê chu kỳ</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setErrors({}); setShowCreate(true) }}>Tạo phiếu kiểm kê</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'CREATED', label: 'CREATED' }, { value: 'RELEASED', label: 'RELEASED' }, { value: 'COUNTING', label: 'COUNTING' }, { value: 'UNDER_REVIEW', label: 'UNDER_REVIEW' }, { value: 'APPROVED', label: 'APPROVED' }, { value: 'POSTED', label: 'POSTED' }]} placeholder="Status" />
          <Select value={filters.warehouseId} onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} placeholder="Warehouse" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Số phiếu</TableHead>
              <TableHead>Loại / Kho</TableHead>
              <TableHead align="right">Số dòng</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={5} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="Chưa có phiếu kiểm kê nào" /> : null}
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

      {selected && (
        <div className="grid gap-5 xl:grid-cols-2 mt-5">
          <div className="wrs-card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-navy-900">Phiếu kiểm kê đang chọn</h3>
              <p className="text-sm text-navy-400">{selected.countNumber}</p>
            </div>
            <div className="rounded-xl border border-moon-300 bg-moon-50/70 p-4 text-sm text-navy-700 space-y-1">
              <p><strong>Trạng thái:</strong> {selected.status}</p>
              <p><strong>Loại:</strong> {selected.countType}</p>
              <p><strong>Kho:</strong> {selected.warehouse?.code || selected.warehouseId}</p>
              <p><strong>Người tạo:</strong> {selected.createdBy}</p>
              <p><strong>Số dòng:</strong> {selected.lines?.length || 0}</p>
            </div>
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Chi tiết kiểm kê & Chênh lệch</h3>
            {selected.lines?.map((line) => (
              <div key={line.id} className="rounded-xl border border-moon-200 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-navy-800">Dòng {line.lineNo}: {line.item?.code || line.itemId}</p>
                  <Badge variant={varianceTone(line.variancePct)}>{line.variancePct !== null ? `${line.variancePct}%` : 'Chờ'}</Badge>
                </div>
                <p className="text-xs text-navy-500">Vị trí: {line.location?.code || line.locationId}</p>
                <p className="text-xs text-navy-500">Tồn hệ thống: {line.snapshotQty?.toLocaleString()} kg · Đã đếm: {line.countedQty?.toLocaleString() ?? '—'} kg</p>
                <p className="text-xs text-navy-500">Chênh lệch: {line.varianceQty?.toLocaleString() ?? '—'} kg · Vấn đề: {line.issueCode || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tạo phiếu kiểm kê"
        description="Tạo phiếu kiểm kê mới theo kho và loại kiểm."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createCycleCount.isPending}>
              {createCycleCount.isPending ? 'Đang xử lý...' : 'Tạo phiếu'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Select label="Kho" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
            {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId}</p>}
          </div>
          <Select label="Loại kiểm kê" value={draft.countType} onChange={(e) => setDraft((prev) => ({ ...prev, countType: e.target.value }))} options={[{ value: 'SPOT', label: 'SPOT' }, { value: 'FULL', label: 'FULL' }, { value: 'SAMPLE', label: 'SAMPLE' }]} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="blindCount" checked={draft.blindCount} onChange={(e) => setDraft((prev) => ({ ...prev, blindCount: e.target.checked }))} className="w-4 h-4 accent-accent" />
            <label htmlFor="blindCount" className="text-sm text-navy-700">Kiểm kê mù (ẩn số lượng tồn hệ thống)</label>
          </div>
          <div className="border-t border-moon-200 pt-3">
            <p className="text-sm font-semibold text-navy-900 mb-2">Dòng 1</p>
            <div className="space-y-3">
              <div>
                <Select label="Vị trí" value={draft.lines[0].locationId} onChange={(e) => updateLine('locationId', e.target.value)} options={[{ value: '', label: '-- Chọn vị trí --' }, ...locations.map((l) => ({ value: l.id, label: l.code }))]} />
                {errors.locationId && <p className="text-xs text-danger mt-1">{errors.locationId}</p>}
              </div>
              <div>
                <Select label="Hàng hóa" value={draft.lines[0].itemId} onChange={(e) => updateLine('itemId', e.target.value)} options={[{ value: '', label: '-- Chọn hàng hóa --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]} />
                {errors.itemId && <p className="text-xs text-danger mt-1">{errors.itemId}</p>}
              </div>
              <Select label="Chủ hàng" value={draft.lines[0].ownerId} onChange={(e) => updateLine('ownerId', e.target.value)} options={[{ value: '', label: '-- Chọn chủ hàng --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
              <Input label="SL tồn hệ thống (kg)" type="number" value={draft.lines[0].snapshotQty} onChange={(e) => updateLine('snapshotQty', e.target.value)} />
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
