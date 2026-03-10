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
    if (!draft.warehouseId) e.warehouseId = 'Warehouse là bắt buộc'
    if (!draft.ownerId) e.ownerId = 'Owner là bắt buộc'
    if (!draft.sourceItemId) e.sourceItemId = 'Source Item là bắt buộc'
    if (!draft.sourceQty || Number(draft.sourceQty) <= 0) e.sourceQty = 'Source Qty phải lớn hơn 0'
    if (!draft.targetQty || Number(draft.targetQty) <= 0) e.targetQty = 'Target Qty phải lớn hơn 0'
    if (!draft.bagWeightKg || Number(draft.bagWeightKg) <= 0) e.bagWeightKg = 'Bag Weight phải lớn hơn 0'
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
        <h2 className="section-title">VAS Work Orders</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setErrors({}); setShowCreate(true) }}>Create Work Order</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'DRAFT', label: 'DRAFT' }, { value: 'CONFIRMED', label: 'CONFIRMED' }, { value: 'IN_PROGRESS', label: 'IN_PROGRESS' }, { value: 'COMPLETED', label: 'COMPLETED' }, { value: 'CANCELLED', label: 'CANCELLED' }]} placeholder="Status" />
          <Select value={filters.vasType} onChange={(e) => setFilters((prev) => ({ ...prev, vasType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'BAGGING', label: 'BAGGING' }, { value: 'REPACKING', label: 'REPACKING' }]} placeholder="VAS Type" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Work Order</TableHead>
              <TableHead>Type / Item</TableHead>
              <TableHead align="right">Source / Target Qty</TableHead>
              <TableHead align="right">Produced</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="No VAS work orders" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.woNumber}</p>
                  <p className="text-xs text-navy-400">{row.owner?.code || row.ownerId}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="default">{row.vasType}</Badge>
                  <p className="text-xs text-navy-400 mt-1">{row.sourceItem?.code || row.sourceItemId}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-medium text-navy-800">{row.sourceQty?.toLocaleString()} kg</p>
                  <p className="text-xs text-navy-400">→ {row.targetQty?.toLocaleString()} bags</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.actualBagsProduced?.toLocaleString() || 0}</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'DRAFT' && <Button variant="outline" size="sm" onClick={() => confirmWorkOrder.mutate(row.id)}>Confirm</Button>}
                    {['DRAFT', 'CONFIRMED'].includes(row.status) && <Button variant="ghost" size="sm" onClick={() => cancelWorkOrder.mutate({ id: row.id, data: {} })}>Cancel</Button>}
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
        title="Create VAS Work Order"
        description="Create bagging or repacking work order."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createWorkOrder.isPending}>
              {createWorkOrder.isPending ? 'Đang xử lý...' : 'Create Work Order'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="VAS Type" value={draft.vasType} onChange={(e) => setDraft((prev) => ({ ...prev, vasType: e.target.value }))} options={[{ value: 'BAGGING', label: 'BAGGING' }, { value: 'REPACKING', label: 'REPACKING' }]} />
          <div>
            <Select label="Warehouse" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn Warehouse --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
            {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId}</p>}
          </div>
          <div>
            <Select label="Owner" value={draft.ownerId} onChange={(e) => setDraft((prev) => ({ ...prev, ownerId: e.target.value }))} options={[{ value: '', label: '-- Chọn Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
            {errors.ownerId && <p className="text-xs text-danger mt-1">{errors.ownerId}</p>}
          </div>
          <div>
            <Select label="Source Item" value={draft.sourceItemId} onChange={(e) => setDraft((prev) => ({ ...prev, sourceItemId: e.target.value }))} options={[{ value: '', label: '-- Chọn Item --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]} />
            {errors.sourceItemId && <p className="text-xs text-danger mt-1">{errors.sourceItemId}</p>}
          </div>
          <div>
            <Input label="Source Qty (kg)" type="number" value={draft.sourceQty} onChange={(e) => setDraft((prev) => ({ ...prev, sourceQty: e.target.value }))} />
            {errors.sourceQty && <p className="text-xs text-danger mt-1">{errors.sourceQty}</p>}
          </div>
          <div>
            <Input label="Target Qty (bags)" type="number" value={draft.targetQty} onChange={(e) => setDraft((prev) => ({ ...prev, targetQty: e.target.value }))} />
            {errors.targetQty && <p className="text-xs text-danger mt-1">{errors.targetQty}</p>}
          </div>
          <div>
            <Input label="Bag Weight (kg)" type="number" value={draft.bagWeightKg} onChange={(e) => setDraft((prev) => ({ ...prev, bagWeightKg: e.target.value }))} />
            {errors.bagWeightKg && <p className="text-xs text-danger mt-1">{errors.bagWeightKg}</p>}
          </div>
        </div>
      </Modal>
    </>
  )
}
