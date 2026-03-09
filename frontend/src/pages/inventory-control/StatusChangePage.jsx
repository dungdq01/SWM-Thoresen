import { useState } from 'react'
import { useStatusChanges, useCreateStatusChange } from '@domains/inventory-control'
import { useLookupItems, useLookupOwners, useLookupWarehouses, useLookupLocations } from '@domains/master-data'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Textarea } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'POSTED') return 'success'
  if (['CANCELLED', 'FAILED', 'REVERSED'].includes(status)) return 'danger'
  return 'default'
}

const initialDraft = {
  warehouseId: '',
  locationId: '',
  itemId: '',
  ownerId: '',
  fromStatus: 'AVAILABLE',
  toStatus: 'BLOCKED',
  qty: '',
  reasonCode: '',
  reasonText: '',
}

export function StatusChangePage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, warehouseId: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState(initialDraft)
  const [errors, setErrors] = useState({})

  const { data: response, isLoading, refetch } = useStatusChanges(filters)
  const createStatusChange = useCreateStatusChange()

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: locations = [] } = useLookupLocations()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const validate = () => {
    const e = {}
    if (!draft.warehouseId) e.warehouseId = 'Kho là bắt buộc'
    if (!draft.locationId) e.locationId = 'Vị trí là bắt buộc'
    if (!draft.itemId) e.itemId = 'Mặt hàng là bắt buộc'
    if (!draft.ownerId) e.ownerId = 'Chủ hàng là bắt buộc'
    if (!draft.qty || Number(draft.qty) <= 0) e.qty = 'Số lượng phải lớn hơn 0'
    if (!draft.reasonCode) e.reasonCode = 'Mã lý do là bắt buộc'
    if (draft.fromStatus === draft.toStatus) e.toStatus = 'Trạng thái nguồn và đích không được giống nhau'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    await createStatusChange.mutateAsync(draft)
    setDraft(initialDraft)
    setErrors({})
    setShowCreate(false)
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Đổi trạng thái tồn kho</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setErrors({}); setShowCreate(true) }}>Tạo đổi trạng thái</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Select value={filters.warehouseId} onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} placeholder="Warehouse" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Số đổi TT</TableHead>
              <TableHead>Hàng / Chủ hàng</TableHead>
              <TableHead>Từ → Đến</TableHead>
              <TableHead align="right">SL</TableHead>
              <TableHead>Lý do</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Chưa có thay đổi trạng thái nào" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.statusChangeNumber}</p>
                  <p className="text-xs text-navy-400">{row.warehouse?.code || row.warehouseId}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.item?.code || row.itemId}</p>
                  <p className="text-xs text-navy-400">{row.owner?.code || row.ownerId}</p>
                </TableCell>
                <TableCell>
                  <p className="text-navy-800">{row.fromStatus} → {row.toStatus}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.qty?.toLocaleString()} {row.uom}</p>
                </TableCell>
                <TableCell>
                  <p className="text-navy-800">{row.reasonCode}</p>
                  <p className="text-xs text-navy-400">{row.reasonText || ''}</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tạo đổi trạng thái"
        description="Đổi trạng thái tồn kho (AVAILABLE ↔ BLOCKED / DAMAGED)."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createStatusChange.isPending}>
              {createStatusChange.isPending ? 'Đang xử lý...' : 'Tạo đổi trạng thái'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Select label="Kho" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
            {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId}</p>}
          </div>
          <div>
            <Select label="Vị trí" value={draft.locationId} onChange={(e) => setDraft((prev) => ({ ...prev, locationId: e.target.value }))} options={[{ value: '', label: '-- Chọn vị trí --' }, ...locations.map((l) => ({ value: l.id, label: l.code }))]} />
            {errors.locationId && <p className="text-xs text-danger mt-1">{errors.locationId}</p>}
          </div>
          <div>
            <Select label="Mặt hàng" value={draft.itemId} onChange={(e) => setDraft((prev) => ({ ...prev, itemId: e.target.value }))} options={[{ value: '', label: '-- Chọn mặt hàng --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]} />
            {errors.itemId && <p className="text-xs text-danger mt-1">{errors.itemId}</p>}
          </div>
          <div>
            <Select label="Chủ hàng" value={draft.ownerId} onChange={(e) => setDraft((prev) => ({ ...prev, ownerId: e.target.value }))} options={[{ value: '', label: '-- Chọn chủ hàng --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
            {errors.ownerId && <p className="text-xs text-danger mt-1">{errors.ownerId}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Từ trạng thái" value={draft.fromStatus} onChange={(e) => setDraft((prev) => ({ ...prev, fromStatus: e.target.value }))} options={[{ value: 'AVAILABLE', label: 'AVAILABLE' }, { value: 'BLOCKED', label: 'BLOCKED' }, { value: 'DAMAGED', label: 'DAMAGED' }]} />
            <div>
              <Select label="Đến trạng thái" value={draft.toStatus} onChange={(e) => setDraft((prev) => ({ ...prev, toStatus: e.target.value }))} options={[{ value: 'AVAILABLE', label: 'AVAILABLE' }, { value: 'BLOCKED', label: 'BLOCKED' }, { value: 'DAMAGED', label: 'DAMAGED' }]} />
              {errors.toStatus && <p className="text-xs text-danger mt-1">{errors.toStatus}</p>}
            </div>
          </div>
          <div>
            <Input label="Số lượng (kg)" type="number" value={draft.qty} onChange={(e) => setDraft((prev) => ({ ...prev, qty: e.target.value }))} />
            {errors.qty && <p className="text-xs text-danger mt-1">{errors.qty}</p>}
          </div>
          <div>
            <Select label="Mã lý do" value={draft.reasonCode} onChange={(e) => setDraft((prev) => ({ ...prev, reasonCode: e.target.value }))} options={[{ value: '', label: '-- Chọn lý do --' }, { value: 'QUALITY_HOLD', label: 'QUALITY_HOLD' }, { value: 'QC_PASSED', label: 'QC_PASSED' }, { value: 'DAMAGE_FOUND', label: 'DAMAGE_FOUND' }, { value: 'CUSTOMER_REQUEST', label: 'CUSTOMER_REQUEST' }]} />
            {errors.reasonCode && <p className="text-xs text-danger mt-1">{errors.reasonCode}</p>}
          </div>
          <Textarea label="Diễn giải lý do" rows={2} value={draft.reasonText} onChange={(e) => setDraft((prev) => ({ ...prev, reasonText: e.target.value }))} />
        </div>
      </Modal>
    </div>
  )
}
