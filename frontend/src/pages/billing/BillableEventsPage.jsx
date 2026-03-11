import { useState } from 'react'
import { useBillingEvents, useCaptureEvent } from '@domains/billing'
import { useLookupOwners, useLookupWarehouses } from '@domains/master-data'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
})

const EVENT_TYPE_OPTIONS = [
  { value: 'INBOUND_HANDLING', label: 'Nhập hàng' },
  { value: 'OUTBOUND_HANDLING', label: 'Xuất hàng' },
  { value: 'BAGGING_FEE', label: 'Đóng gói' },
  { value: 'STORAGE', label: 'Lưu trữ' },
]

const eventTypeTone = (eventType) => {
  if (eventType.includes('RECEIPT') || eventType.includes('IN')) return 'success'
  if (eventType.includes('SHIPMENT') || eventType.includes('OUT')) return 'danger'
  if (eventType.includes('VAS')) return 'warning'
  return 'info'
}

const initialDraft = {
  eventType: '',
  ownerId: '',
  warehouseId: '',
  billingQtyMt: '',
  eventDate: new Date().toISOString().split('T')[0],
}

export function BillableEventsPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 30, ownerId: '', eventType: '', invoiced: undefined })
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState(initialDraft)
  const [errors, setErrors] = useState({})

  const { data: response, isLoading, refetch } = useBillingEvents(filters)
  const captureEvent = useCaptureEvent()
  const { data: owners = [] } = useLookupOwners()
  const { data: warehouses = [] } = useLookupWarehouses()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const ownerMap = Object.fromEntries(owners.map(o => [o.id, o]))
  const warehouseMap = Object.fromEntries(warehouses.map(w => [w.id, w]))

  const validate = () => {
    const e = {}
    if (!draft.eventType) e.eventType = 'Loại sự kiện là bắt buộc'
    if (!draft.ownerId) e.ownerId = 'Chủ sở hữu là bắt buộc'
    if (!draft.warehouseId) e.warehouseId = 'Kho là bắt buộc'
    if (!draft.billingQtyMt || parseFloat(draft.billingQtyMt) <= 0) e.billingQtyMt = 'Số lượng phải > 0'
    if (!draft.eventDate) e.eventDate = 'Ngày sự kiện là bắt buộc'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    const now = new Date().toISOString()
    const payload = {
      eventType: draft.eventType,
      refType: 'MANUAL',
      refId: `MANUAL-${Date.now()}`,
      ownerId: draft.ownerId,
      warehouseId: draft.warehouseId,
      billingQtyMt: parseFloat(draft.billingQtyMt),
      eventDate: draft.eventDate,
      operationTimestamp: now,
      sourceModule: 'BILLING_UI',
      externalId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      correlationId: generateUUID(),
    }
    await captureEvent.mutateAsync(payload)
    setDraft(initialDraft)
    setErrors({})
    setShowCreate(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Sự kiện thanh toán</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(initialDraft); setErrors({}); setShowCreate(true) }}>Tạo Sự kiện</Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} placeholder="Chủ sở hữu" />
          <Select value={filters.eventType} onChange={(e) => setFilters((prev) => ({ ...prev, eventType: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, ...EVENT_TYPE_OPTIONS]} placeholder="Loại sự kiện" />
          <Select value={filters.invoiced === undefined ? '' : filters.invoiced.toString()} onChange={(e) => setFilters((prev) => ({ ...prev, invoiced: e.target.value === '' ? undefined : e.target.value === 'true', page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'true', label: 'Đã tính hóa đơn' }, { value: 'false', label: 'Chưa tính hóa đơn' }]} placeholder="Trạng thái thanh toán" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Loại sự kiện</TableHead>
              <TableHead>Nguồn</TableHead>
              <TableHead>Chủ sở hữu / Kho</TableHead>
              <TableHead align="right">Số lượng</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead align="center">Thanh toán</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Không có sự kiện thanh toán" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Badge variant={eventTypeTone(row.eventType)}>{EVENT_TYPE_OPTIONS.find(o => o.value === row.eventType)?.label || row.eventType}</Badge>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.refId || row.sourceId || '-'}</p>
                  <p className="text-xs text-navy-400">{row.sourceModule}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.owner?.name || ownerMap[row.ownerId]?.name || '-'}</p>
                  <p className="text-xs text-navy-400">{row.warehouse?.name || warehouseMap[row.warehouseId]?.name || '-'}</p>
                </TableCell>
                <TableCell align="right">
                  <p className="font-semibold text-navy-900">{row.billingQtyMt?.toLocaleString()} MT</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-navy-500">{row.eventDate ? new Date(row.eventDate).toLocaleDateString('vi-VN') : '-'}</p>
                </TableCell>
                <TableCell align="center">
                  <Badge variant={row.billingStatus === 'BILLED' ? 'success' : 'warning'}>{row.billingStatus === 'BILLED' ? 'Có' : 'Không'}</Badge>
                  {row.debitNoteLineId && <p className="text-xs text-navy-400 mt-1">{row.debitNoteLineId}</p>}
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
        title="Tạo Sự kiện thanh toán"
        description="Tạo sự kiện thanh toán thủ công cho chủ sở hữu."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={captureEvent.isPending}>
              {captureEvent.isPending ? 'Đang tạo...' : 'Tạo Sự kiện'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Select label="Loại sự kiện" value={draft.eventType} onChange={(e) => setDraft((prev) => ({ ...prev, eventType: e.target.value }))} options={[{ value: '', label: '-- Chọn Loại sự kiện --' }, ...EVENT_TYPE_OPTIONS]} />
            {errors.eventType && <p className="text-xs text-danger mt-1">{errors.eventType}</p>}
          </div>
          <div>
            <Select label="Chủ sở hữu" value={draft.ownerId} onChange={(e) => setDraft((prev) => ({ ...prev, ownerId: e.target.value }))} options={[{ value: '', label: '-- Chọn Chủ sở hữu --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
            {errors.ownerId && <p className="text-xs text-danger mt-1">{errors.ownerId}</p>}
          </div>
          <div>
            <Select label="Kho" value={draft.warehouseId} onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn Kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
            {errors.warehouseId && <p className="text-xs text-danger mt-1">{errors.warehouseId}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input label="Số lượng (MT)" type="number" step="0.01" value={draft.billingQtyMt} onChange={(e) => setDraft((prev) => ({ ...prev, billingQtyMt: e.target.value }))} />
              {errors.billingQtyMt && <p className="text-xs text-danger mt-1">{errors.billingQtyMt}</p>}
            </div>
            <div>
              <Input label="Ngày sự kiện" type="date" value={draft.eventDate} onChange={(e) => setDraft((prev) => ({ ...prev, eventDate: e.target.value }))} />
              {errors.eventDate && <p className="text-xs text-danger mt-1">{errors.eventDate}</p>}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
