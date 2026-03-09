import { useState } from 'react'
import { useTransferOrders, useCreateTransferOrder, useReleaseTransferOrder, useShipTransferOrder, useReceiveTransferOrder, useCloseTransferOrder, useCancelTransferOrder } from '@domains/inventory-control'
import { useLookupItems, useLookupOwners, useLookupWarehouses, useLookupLocations } from '@domains/master-data'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const statusTone = (status) => {
  if (['RECEIVED', 'CLOSED'].includes(status)) return 'success'
  if (['CANCELLED', 'FAILED'].includes(status)) return 'danger'
  if (status === 'IN_TRANSIT') return 'warning'
  if (['RELEASED', 'SHIPPED'].includes(status)) return 'info'
  return 'default'
}

const initialDraft = {
  fromWarehouseId: '',
  toWarehouseId: '',
  vehicleNumber: '',
  lines: [{ itemId: '', ownerId: '', fromLocationId: '', toLocationId: '', requestedQty: '' }],
}

export function TransferOrdersPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState(initialDraft)
  const [errors, setErrors] = useState({})

  const { data: response, isLoading, refetch } = useTransferOrders(filters)
  const createTransferOrder = useCreateTransferOrder()
  const releaseTransferOrder = useReleaseTransferOrder()
  const shipTransferOrder = useShipTransferOrder()
  const receiveTransferOrder = useReceiveTransferOrder()
  const closeTransferOrder = useCloseTransferOrder()
  const cancelTransferOrder = useCancelTransferOrder()

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: locations = [] } = useLookupLocations()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const validate = () => {
    const e = {}
    if (!draft.fromWarehouseId) e.fromWarehouseId = 'From Warehouse là bắt buộc'
    if (!draft.toWarehouseId) e.toWarehouseId = 'To Warehouse là bắt buộc'
    if (draft.fromWarehouseId && draft.toWarehouseId && draft.fromWarehouseId === draft.toWarehouseId) e.toWarehouseId = 'From và To Warehouse không được giống nhau'
    if (!draft.lines[0].itemId) e.itemId = 'Item là bắt buộc'
    if (!draft.lines[0].requestedQty || Number(draft.lines[0].requestedQty) <= 0) e.requestedQty = 'Qty phải lớn hơn 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    await createTransferOrder.mutateAsync(draft)
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
    <div className="page-section">
      <div className="page-header">
        <h2 className="section-title">Transfer Orders (Inter-Warehouse)</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setErrors({}); setShowCreate(true) }}>Create Transfer Order</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'CREATED', label: 'CREATED' }, { value: 'RELEASED', label: 'RELEASED' }, { value: 'SHIPPED', label: 'SHIPPED' }, { value: 'IN_TRANSIT', label: 'IN_TRANSIT' }, { value: 'RECEIVED', label: 'RECEIVED' }, { value: 'CLOSED', label: 'CLOSED' }]} placeholder="Status" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Transfer Order</TableHead>
              <TableHead>From → To</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead align="right">Qty</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="No transfer orders available" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.transferNumber}</p>
                  <p className="text-xs text-navy-400">{row.lines?.length || 0} line(s)</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.fromWarehouse?.code || row.fromWarehouseId}</p>
                  <p className="text-xs text-navy-400">→ {row.toWarehouse?.code || row.toWarehouseId}</p>
                </TableCell>
                <TableCell>
                  <p className="text-navy-800">{row.vehicleNumber || 'N/A'}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.lines?.reduce((sum, l) => sum + (l.requestedQty || 0), 0).toLocaleString()} kg</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'CREATED' && <Button variant="outline" size="sm" onClick={() => releaseTransferOrder.mutate(row.id)}>Release</Button>}
                    {row.status === 'RELEASED' && <Button variant="accent" size="sm" onClick={() => shipTransferOrder.mutate({ id: row.id, data: {} })}>Ship</Button>}
                    {row.status === 'IN_TRANSIT' && <Button variant="accent" size="sm" onClick={() => receiveTransferOrder.mutate({ id: row.id, data: {} })}>Receive</Button>}
                    {row.status === 'RECEIVED' && <Button variant="outline" size="sm" onClick={() => closeTransferOrder.mutate({ id: row.id, data: {} })}>Close</Button>}
                    {(row.status === 'CREATED' || row.status === 'RELEASED') && <Button variant="ghost" size="sm" onClick={() => cancelTransferOrder.mutate({ id: row.id, data: {} })}>Cancel</Button>}
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
        title="Create Transfer Order"
        description="Transfer inventory between warehouses with IN_TRANSIT status."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createTransferOrder.isPending}>
              {createTransferOrder.isPending ? 'Đang xử lý...' : 'Create Transfer Order'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select label="From Warehouse" value={draft.fromWarehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, fromWarehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn From Warehouse --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
              {errors.fromWarehouseId && <p className="text-xs text-danger mt-1">{errors.fromWarehouseId}</p>}
            </div>
            <div>
              <Select label="To Warehouse" value={draft.toWarehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, toWarehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn To Warehouse --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
              {errors.toWarehouseId && <p className="text-xs text-danger mt-1">{errors.toWarehouseId}</p>}
            </div>
          </div>
          <Input label="Vehicle Number" value={draft.vehicleNumber} onChange={(e) => setDraft((prev) => ({ ...prev, vehicleNumber: e.target.value }))} />

          <div className="border-t border-moon-200 pt-4">
            <p className="text-sm font-semibold text-navy-900 mb-3">Line 1</p>
            <div className="space-y-3">
              <div>
                <Select label="Item" value={draft.lines[0].itemId} onChange={(e) => updateLine(0, 'itemId', e.target.value)} options={[{ value: '', label: '-- Chọn Item --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]} />
                {errors.itemId && <p className="text-xs text-danger mt-1">{errors.itemId}</p>}
              </div>
              <Select label="Owner" value={draft.lines[0].ownerId} onChange={(e) => updateLine(0, 'ownerId', e.target.value)} options={[{ value: '', label: '-- Chọn Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
              <Select label="From Location" value={draft.lines[0].fromLocationId} onChange={(e) => updateLine(0, 'fromLocationId', e.target.value)} options={[{ value: '', label: '-- Chọn Location --' }, ...locations.map((l) => ({ value: l.id, label: l.code }))]} />
              <div>
                <Input label="Qty (kg)" type="number" value={draft.lines[0].requestedQty} onChange={(e) => updateLine(0, 'requestedQty', e.target.value)} />
                {errors.requestedQty && <p className="text-xs text-danger mt-1">{errors.requestedQty}</p>}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
