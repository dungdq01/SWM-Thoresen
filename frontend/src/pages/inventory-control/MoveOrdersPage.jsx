import { useState } from 'react'
import { useMoveOrders, useCreateMoveOrder, useConfirmMoveOrder, useExecuteMoveOrder, useCancelMoveOrder } from '@domains/inventory-control'
import { useLookupItems, useLookupOwners, useLookupWarehouses, useLookupLocations } from '@domains/master-data'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

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
  const [showCreate, setShowCreate] = useState(false)
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
  const { data: locations = [] } = useLookupLocations(draft.warehouseId)

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
    setShowCreate(false)
  }

  const updateLine = (index, field, value) => {
    const newLines = [...draft.lines]
    newLines[index] = { ...newLines[index], [field]: value }
    setDraft((prev) => ({ ...prev, lines: newLines }))
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Lệnh di chuyển nội bộ</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setErrors({}); setShowCreate(true) }}>Tạo lệnh di chuyển</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'DRAFT' }, { value: 'CONFIRMED', label: 'CONFIRMED' }, { value: 'IN_PROGRESS', label: 'IN_PROGRESS' }, { value: 'COMPLETED', label: 'COMPLETED' }, { value: 'CANCELLED', label: 'CANCELLED' }]} placeholder="Status" />
          <Select value={filters.warehouseId} onChange={(e) => setFilters((prev) => ({ ...prev, warehouseId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} placeholder="Warehouse" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Số lệnh</TableHead>
              <TableHead>Kho / Lý do</TableHead>
              <TableHead align="right">Dòng / SL</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={5} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="Chưa có lệnh di chuyển nào" /> : null}
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
                  <p className="font-semibold text-navy-900">{row.lines?.length || 0} dòng</p>
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

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tạo lệnh di chuyển"
        description="Di chuyển hàng hóa giữa các vị trí trong cùng một kho."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createMoveOrder.isPending}>
              {createMoveOrder.isPending ? 'Đang xử lý...' : 'Tạo lệnh'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Select label="Kho" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value, lines: prev.lines.map(l => ({ ...l, fromLocationId: '', toLocationId: '' })) }))} options={[{ value: '', label: '-- Chọn kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
            {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId}</p>}
          </div>
          <Select label="Lý do" value={draft.reasonCode} onChange={(e) => setDraft((prev) => ({ ...prev, reasonCode: e.target.value }))} options={[{ value: '', label: '-- Chọn lý do --' }, { value: 'CONSOLIDATE', label: 'CONSOLIDATE' }, { value: 'REPLENISH', label: 'REPLENISH' }, { value: 'REORGANIZE', label: 'REORGANIZE' }]} />

          <div className="border-t border-moon-200 pt-4">
            <p className="text-sm font-semibold text-navy-900 mb-3">Dòng 1</p>
            <div className="space-y-3">
              <div>
                <Select label="Hàng hóa" value={draft.lines[0].itemId} onChange={(e) => updateLine(0, 'itemId', e.target.value)} options={[{ value: '', label: '-- Chọn hàng hóa --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]} />
                {errors.itemId && <p className="text-xs text-danger mt-1">{errors.itemId}</p>}
              </div>
              <Select label="Chủ hàng" value={draft.lines[0].ownerId} onChange={(e) => updateLine(0, 'ownerId', e.target.value)} options={[{ value: '', label: '-- Chọn chủ hàng --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
              <div>
                <Select label="Vị trí nguồn" value={draft.lines[0].fromLocationId} onChange={(e) => updateLine(0, 'fromLocationId', e.target.value)} options={[{ value: '', label: '-- Chọn vị trí --' }, ...locations.map((l) => ({ value: l.id, label: l.code }))]} />
                {errors.fromLocationId && <p className="text-xs text-danger mt-1">{errors.fromLocationId}</p>}
              </div>
              <div>
                <Select label="Vị trí đích" value={draft.lines[0].toLocationId} onChange={(e) => updateLine(0, 'toLocationId', e.target.value)} options={[{ value: '', label: '-- Chọn vị trí --' }, ...locations.map((l) => ({ value: l.id, label: l.code }))]} />
                {errors.toLocationId && <p className="text-xs text-danger mt-1">{errors.toLocationId}</p>}
              </div>
              <div>
                <Input label="Số lượng (kg)" type="number" value={draft.lines[0].requestedQty} onChange={(e) => updateLine(0, 'requestedQty', e.target.value)} />
                {errors.requestedQty && <p className="text-xs text-danger mt-1">{errors.requestedQty}</p>}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
