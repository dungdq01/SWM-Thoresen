import { useState } from 'react'
import { useVasWorkOrders, useCreateVasWorkOrder, useConfirmVasWorkOrder, useCancelVasWorkOrder } from '@domains/vas'
import { useLookupItems, useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'CANCELLED') return 'danger'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'CONFIRMED') return 'info'
  return 'default'
}

const initialDraft = {
  vasType: 'BAGGING',
  warehouseId: '',
  ownerId: '',
  sourceItemId: '',
  sourceQty: '',
  targetQty: '',
  bagWeightKg: '50',
}

export function VasWorkOrdersPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', vasType: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState(initialDraft)
  const [errors, setErrors] = useState({})

  const { data: response, isLoading, refetch } = useVasWorkOrders(filters)
  const createWorkOrder = useCreateVasWorkOrder()
  const confirmWorkOrder = useConfirmVasWorkOrder()
  const cancelWorkOrder = useCancelVasWorkOrder()

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const validate = () => {
    const e = {}
    if (!draft.warehouseId) e.warehouseId = 'Kho là bắt buộc'
    if (!draft.ownerId) e.ownerId = 'Chủ hàng là bắt buộc'
    if (!draft.sourceItemId) e.sourceItemId = 'Mặt hàng nguồn là bắt buộc'
    if (!draft.sourceQty || Number(draft.sourceQty) <= 0) e.sourceQty = 'Khối lượng nguồn phải lớn hơn 0'
    if (!draft.targetQty || Number(draft.targetQty) <= 0) e.targetQty = 'Số lượng bao phải lớn hơn 0'
    if (!draft.bagWeightKg || Number(draft.bagWeightKg) <= 0) e.bagWeightKg = 'Trọng lượng bao phải lớn hơn 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    await createWorkOrder.mutateAsync(draft)
    setDraft(initialDraft)
    setErrors({})
    setShowCreate(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Đơn Hàng VAS</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setErrors({}); setShowCreate(true) }}>Tạo Đơn Hàng</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm Mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'Nháp' }, { value: 'CONFIRMED', label: 'Đã Xác Nhận' }, { value: 'IN_PROGRESS', label: 'Đang Thực Hiện' }, { value: 'COMPLETED', label: 'Hoàn Thành' }, { value: 'CANCELLED', label: 'Đã Hủy' }]} placeholder="Trạng Thái" />
          <Select value={filters.vasType} onChange={(e) => setFilters((prev) => ({ ...prev, vasType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'BAGGING', label: 'Đóng Bao' }, { value: 'REPACKING', label: 'Đóng Gói Lại' }]} placeholder="Loại VAS" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Đơn Hàng</TableHead>
              <TableHead>Loại / Mặt Hàng</TableHead>
              <TableHead align="right">Nguồn / Mục Tiêu</TableHead>
              <TableHead align="right">Sản Xuất</TableHead>
              <TableHead align="center">Trạng Thái</TableHead>
              <TableHead align="center">Hành Động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Không có đơn hàng VAS" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.woNumber}</p>
                  <p className="text-xs text-navy-400">{row.owner?.ownerCode || row.ownerId || '-'}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="default">Đóng Bao</Badge>
                  <p className="text-xs text-navy-400 mt-1">{row.bulkSourceItem?.itemCode || row.bulkSourceItemId || '-'}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-medium text-navy-800">{row.plannedQtyKg ? Number(row.plannedQtyKg).toLocaleString() : '-'} kg</p>
                  <p className="text-xs text-navy-400">→ {row.packagingQtyPlanned?.toLocaleString() || '-'} bao</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.actualBagCount?.toLocaleString() || 0}</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'DRAFT' && <Button variant="outline" size="sm" onClick={() => confirmWorkOrder.mutate(row.id)}>Xác Nhận</Button>}
                    {['DRAFT', 'CONFIRMED'].includes(row.status) && <Button variant="ghost" size="sm" onClick={() => cancelWorkOrder.mutate({ id: row.id, data: {} })}>Hủy</Button>}
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
        title="Tạo Đơn Hàng VAS"
        description="Tạo đơn hàng đóng bao hoặc đóng gói lại."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createWorkOrder.isPending}>
              {createWorkOrder.isPending ? 'Đang xử lý...' : 'Tạo Đơn Hàng'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Loại VAS" value={draft.vasType} onChange={(e) => setDraft((prev) => ({ ...prev, vasType: e.target.value }))} options={[{ value: 'BAGGING', label: 'Đóng Bao' }, { value: 'REPACKING', label: 'Đóng Gói Lại' }]} />
          <div>
            <Select label="Kho" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn Kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
            {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId}</p>}
          </div>
          <div>
            <Select label="Chủ Hàng" value={draft.ownerId} onChange={(e) => setDraft((prev) => ({ ...prev, ownerId: e.target.value }))} options={[{ value: '', label: '-- Chọn Chủ Hàng --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
            {errors.ownerId && <p className="text-xs text-danger mt-1">{errors.ownerId}</p>}
          </div>
          <div>
            <Select label="Mặt Hàng Nguồn" value={draft.sourceItemId} onChange={(e) => setDraft((prev) => ({ ...prev, sourceItemId: e.target.value }))} options={[{ value: '', label: '-- Chọn Mặt Hàng --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]} />
            {errors.sourceItemId && <p className="text-xs text-danger mt-1">{errors.sourceItemId}</p>}
          </div>
          <div>
            <Input label="Khối Lượng Nguồn (kg)" type="number" value={draft.sourceQty} onChange={(e) => setDraft((prev) => ({ ...prev, sourceQty: e.target.value }))} />
            {errors.sourceQty && <p className="text-xs text-danger mt-1">{errors.sourceQty}</p>}
          </div>
          <div>
            <Input label="Số Lượng Bao (bao)" type="number" value={draft.targetQty} onChange={(e) => setDraft((prev) => ({ ...prev, targetQty: e.target.value }))} />
            {errors.targetQty && <p className="text-xs text-danger mt-1">{errors.targetQty}</p>}
          </div>
          <div>
            <Input label="Trọng Lượng Bao (kg)" type="number" value={draft.bagWeightKg} onChange={(e) => setDraft((prev) => ({ ...prev, bagWeightKg: e.target.value }))} />
            {errors.bagWeightKg && <p className="text-xs text-danger mt-1">{errors.bagWeightKg}</p>}
          </div>
        </div>
      </Modal>
    </>
  )
}
