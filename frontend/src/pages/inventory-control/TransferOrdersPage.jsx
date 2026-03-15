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
  const { data: fromLocations = [] } = useLookupLocations(draft.fromWarehouseId)

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
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Lệnh chuyển kho</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setErrors({}); setShowCreate(true) }}>Tạo lệnh chuyển kho</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'CREATED', label: 'CREATED' }, { value: 'RELEASED', label: 'RELEASED' }, { value: 'SHIPPED', label: 'SHIPPED' }, { value: 'IN_TRANSIT', label: 'IN_TRANSIT' }, { value: 'RECEIVED', label: 'RECEIVED' }, { value: 'CLOSED', label: 'CLOSED' }]} placeholder="Trạng thái" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Số lệnh</TableHead>
              <TableHead>Từ → Đến</TableHead>
              <TableHead>Xe</TableHead>
              <TableHead align="right">Số lượng</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Chưa có lệnh chuyển kho nào" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.transferNumber}</p>
                  <p className="text-xs text-navy-400">{row.lines?.length || 0} dòng</p>
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
                    {row.status === 'CREATED' && <Button variant="outline" size="sm" onClick={() => releaseTransferOrder.mutate(row.id)}>Xuất kho</Button>}
                    {row.status === 'RELEASED' && <Button variant="accent" size="sm" onClick={() => shipTransferOrder.mutate({ id: row.id, data: {} })}>Vận chuyển</Button>}
                    {row.status === 'IN_TRANSIT' && <Button variant="accent" size="sm" onClick={() => receiveTransferOrder.mutate({ id: row.id, data: {} })}>Nhận hàng</Button>}
                    {row.status === 'RECEIVED' && <Button variant="outline" size="sm" onClick={() => closeTransferOrder.mutate({ id: row.id, data: {} })}>Đóng</Button>}
                    {(row.status === 'CREATED' || row.status === 'RELEASED') && <Button variant="ghost" size="sm" onClick={() => cancelTransferOrder.mutate({ id: row.id, data: {} })}>Hủy</Button>}
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
        title="Tạo lệnh chuyển kho"
        description="Chuyển hàng giữa các kho với trạng thái ĐANG VẬN CHUYỂN."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createTransferOrder.isPending}>
              {createTransferOrder.isPending ? 'Đang xử lý...' : 'Tạo lệnh'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select label="Kho nguồn" value={draft.fromWarehouseId} onChange={(e) => { setDraft((prev) => ({ ...prev, fromWarehouseId: e.target.value, lines: prev.lines.map(l => ({ ...l, fromLocationId: '' })) })) }} options={[{ value: '', label: '-- Chọn kho nguồn --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
              {errors.fromWarehouseId && <p className="text-xs text-danger mt-1">{errors.fromWarehouseId}</p>}
            </div>
            <div>
              <Select label="Kho đích" value={draft.toWarehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, toWarehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn kho đích --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
              {errors.toWarehouseId && <p className="text-xs text-danger mt-1">{errors.toWarehouseId}</p>}
            </div>
          </div>
          <Input label="Biển số xe" value={draft.vehicleNumber} onChange={(e) => setDraft((prev) => ({ ...prev, vehicleNumber: e.target.value }))} />

          <div className="border-t border-moon-200 pt-4">
            <p className="text-sm font-semibold text-navy-900 mb-3">Dòng 1</p>
            <div className="space-y-3">
              <div>
                <Select label="Hàng hóa" value={draft.lines[0].itemId} onChange={(e) => updateLine(0, 'itemId', e.target.value)} options={[{ value: '', label: '-- Chọn hàng hóa --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]} />
                {errors.itemId && <p className="text-xs text-danger mt-1">{errors.itemId}</p>}
              </div>
              <Select label="Chủ hàng" value={draft.lines[0].ownerId} onChange={(e) => updateLine(0, 'ownerId', e.target.value)} options={[{ value: '', label: '-- Chọn chủ hàng --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
              <Select label="Vị trí nguồn" value={draft.lines[0].fromLocationId} onChange={(e) => updateLine(0, 'fromLocationId', e.target.value)} options={[{ value: '', label: '-- Chọn vị trí --' }, ...fromLocations.map((l) => ({ value: l.id, label: l.code }))]} disabled={!draft.fromWarehouseId} />
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
