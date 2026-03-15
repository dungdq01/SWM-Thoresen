import { useState, useCallback } from 'react'
import { FileText, Plus, Trash2, Check, Lock, Ban, ChevronDown, ChevronUp, Package, Ship, Sparkles } from 'lucide-react'
import {
  useSalesOrders,
  useCreateSalesOrder,
  useUpdateSalesOrder,
  useConfirmSalesOrder,
  useCloseSalesOrder,
  useCancelSalesOrder,
  useNextSoNumber,
} from '@domains/sales-orders'
import { useLookupOwners, useLookupWarehouses, useLookupItems, useLookupUoms } from '@domains/master-data'
import { useCustomerList } from '@domains/master-data'
import {
  Badge, Button, Input, Modal, Pagination, Select,
  Table, TableBody, TableCell, TableEmpty, TableHead,
  TableHeader, TableLoading, TableRow, Textarea,
} from '@shared/ui'

const SO_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PARTIALLY_RELEASED', label: 'Xuất 1 phần' },
  { value: 'FULLY_RELEASED', label: 'Xuất đủ' },
  { value: 'SHIPPED', label: 'Đã giao' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const CARGO_FORMS = [
  { value: 'BULK', label: 'Hàng rời' },
  { value: 'BAGGED_25KG', label: 'Bao 25kg' },
  { value: 'BAGGED_40KG', label: 'Bao 40kg' },
  { value: 'BAGGED_50KG', label: 'Bao 50kg' },
  { value: 'JUMBO', label: 'Jumbo' },
  { value: 'PACKAGING', label: 'Đóng gói' },
  { value: 'DRUM', label: 'Thùng phuy' },
  { value: 'PALLET', label: 'Pallet' },
  { value: 'CONTAINER', label: 'Container' },
  { value: 'OTHER', label: 'Khác' },
]

const statusVariant = (status) => {
  const map = {
    DRAFT: 'warning',
    CONFIRMED: 'info',
    PARTIALLY_RELEASED: 'warning',
    FULLY_RELEASED: 'success',
    SHIPPED: 'success',
    CLOSED: 'default',
    CANCELLED: 'danger',
    OPEN: 'warning',
  }
  return map[status] || 'default'
}

const statusLabel = (status) => {
  const found = SO_STATUSES.find((s) => s.value === status)
  return found ? found.label : status
}

const fmtKg = (val) => Number(val || 0).toLocaleString('vi-VN')
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

const emptyLine = { itemId: '', expectedQty: '', uomId: '', unitPrice: '', cargoForm: 'BULK', notes: '' }

const emptyDraft = {
  ownerId: '',
  customerId: '',
  warehouseId: '',
  externalSoNumber: '',
  expectedDeliveryDate: '',
  deliveryAddress: '',
  notes: '',
  currency: 'VND',
  lines: [{ ...emptyLine }],
}

export function SalesOrdersPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, search: '', status: '', ownerId: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showCancel, setShowCancel] = useState(null)
  const [cancelReason, setCancelReason] = useState({ reasonCode: '', note: '' })
  const [expandedId, setExpandedId] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [editDraft, setEditDraft] = useState(null)

  const { data: nextSoResponse } = useNextSoNumber(showCreate)
  const nextSoNumber = nextSoResponse?.code || ''

  const { data: response, isLoading, refetch } = useSalesOrders({
    ...filters,
    search: filters.search || undefined,
    status: filters.status || undefined,
    ownerId: filters.ownerId || undefined,
  })

  const createSo = useCreateSalesOrder()
  const updateSo = useUpdateSalesOrder()
  const confirmSo = useConfirmSalesOrder()
  const closeSo = useCloseSalesOrder()
  const cancelSo = useCancelSalesOrder()

  const { data: owners = [] } = useLookupOwners()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: items = [] } = useLookupItems()
  const { data: uoms = [] } = useLookupUoms()
  const { data: customerResponse } = useCustomerList({ page: 1, pageSize: 200 })
  const customers = customerResponse?.items || customerResponse?.data || []

  const apiData = response?.data || response || {}
  const rows = apiData.items || apiData.data?.items || []
  const pagination = { page: apiData.page || 1, totalPages: apiData.totalPages || 1 }

  // ── Draft line helpers ──
  const updateDraftLine = useCallback((idx, field, value) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    }))
  }, [])

  const addDraftLine = useCallback(() => {
    setDraft((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }))
  }, [])

  const removeDraftLine = useCallback((idx) => {
    setDraft((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }))
  }, [])

  // ── Edit line helpers ──
  const updateEditLine = useCallback((idx, field, value) => {
    setEditDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    }))
  }, [])

  const addEditLine = useCallback(() => {
    setEditDraft((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }))
  }, [])

  const removeEditLine = useCallback((idx) => {
    setEditDraft((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }))
  }, [])

  const customerOptions = [{ value: '', label: '-- Chọn khách hàng --' }, ...customers.map((c) => ({ value: c.id, label: `${c.customerCode} - ${c.customerName}` }))]

  // ── Actions ──
  const handleCreate = async () => {
    const externalId = `SO-WEB-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    const payload = {
      externalId,
      ownerId: draft.ownerId,
      customerId: draft.customerId,
      warehouseId: draft.warehouseId,
      externalSoNumber: draft.externalSoNumber || undefined,
      expectedDeliveryDate: draft.expectedDeliveryDate || undefined,
      deliveryAddress: draft.deliveryAddress || undefined,
      notes: draft.notes || undefined,
      currency: draft.currency,
      lines: draft.lines.filter((l) => l.itemId).map((l) => ({
        itemId: l.itemId,
        cargoForm: l.cargoForm,
        uomId: l.uomId,
        expectedQty: Number(l.expectedQty || 0),
        expectedQtyKg: Number(l.expectedQty || 0),
        unitPrice: l.unitPrice ? Number(l.unitPrice) : undefined,
        notes: l.notes || undefined,
      })),
    }
    await createSo.mutateAsync(payload)
    setDraft(emptyDraft)
    setShowCreate(false)
  }

  const handleOpenEdit = (so) => {
    setEditDraft({
      id: so.id,
      soNumber: so.soNumber,
      customerId: so.customerId,
      expectedDeliveryDate: so.expectedDeliveryDate ? so.expectedDeliveryDate.slice(0, 10) : '',
      deliveryAddress: so.deliveryAddress || '',
      notes: so.notes || '',
      externalSoNumber: so.externalSoNumber || '',
      lines: (so.lines || []).map((l) => ({
        itemId: l.itemId,
        expectedQty: Number(l.expectedQty || 0),
        uomId: l.uomId,
        unitPrice: l.unitPrice ? Number(l.unitPrice) : '',
        cargoForm: l.cargoForm || 'BULK',
        notes: l.notes || '',
      })),
    })
    setShowEdit(true)
  }

  const handleUpdate = async () => {
    if (!editDraft) return
    const payload = {
      customerId: editDraft.customerId || undefined,
      expectedDeliveryDate: editDraft.expectedDeliveryDate || undefined,
      deliveryAddress: editDraft.deliveryAddress || undefined,
      notes: editDraft.notes || undefined,
      externalSoNumber: editDraft.externalSoNumber || undefined,
      lines: editDraft.lines.filter((l) => l.itemId).map((l) => ({
        itemId: l.itemId,
        cargoForm: l.cargoForm,
        uomId: l.uomId,
        expectedQty: Number(l.expectedQty || 0),
        expectedQtyKg: Number(l.expectedQty || 0),
        unitPrice: l.unitPrice ? Number(l.unitPrice) : undefined,
        notes: l.notes || undefined,
      })),
    }
    await updateSo.mutateAsync({ id: editDraft.id, data: payload })
    setEditDraft(null)
    setShowEdit(false)
  }

  const handleCancel = async () => {
    if (!showCancel || !cancelReason.reasonCode) return
    await cancelSo.mutateAsync({ id: showCancel, data: cancelReason })
    setShowCancel(null)
    setCancelReason({ reasonCode: '', note: '' })
  }

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id))

  const ownerOptions = [{ value: '', label: '-- Chọn Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]
  const warehouseOptions = [{ value: '', label: '-- Chọn Kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]
  const itemOptions = [{ value: '', label: '-- Chọn mặt hàng --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]
  const uomOptions = [{ value: '', label: '-- Đơn vị --' }, ...uoms.map((u) => ({ value: u.id, label: `${u.code} - ${u.name}` }))]

  // ── Render line editor ──
  const renderLineEditor = (lines, updateFn, addFn, removeFn) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-navy-900">Danh sách mặt hàng</h4>
        <Button variant="outline" size="sm" onClick={addFn}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm dòng
        </Button>
      </div>
      {lines.map((line, idx) => (
        <div key={idx} className="rounded-xl border border-moon-200 p-3 space-y-2 bg-moon-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-navy-400">Dòng {idx + 1}</span>
            {lines.length > 1 && (
              <button onClick={() => removeFn(idx)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Select label="Mặt hàng *" value={line.itemId} onChange={(e) => updateFn(idx, 'itemId', e.target.value)} options={itemOptions} />
            <Select label="Đơn vị tính *" value={line.uomId} onChange={(e) => updateFn(idx, 'uomId', e.target.value)} options={uomOptions} />
            <Select label="Hình thức hàng *" value={line.cargoForm} onChange={(e) => updateFn(idx, 'cargoForm', e.target.value)} options={CARGO_FORMS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Số lượng (kg) *" type="number" value={line.expectedQty} onChange={(e) => updateFn(idx, 'expectedQty', e.target.value)} />
            <Input label="Đơn giá" type="number" value={line.unitPrice} onChange={(e) => updateFn(idx, 'unitPrice', e.target.value)} />
          </div>
          <Input label="Ghi chú dòng" value={line.notes} onChange={(e) => updateFn(idx, 'notes', e.target.value)} />
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Đơn bán hàng (Sales Orders)</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(emptyDraft); setShowCreate(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Tạo SO
          </Button>
          <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input placeholder="Tìm theo mã SO, khách hàng..." value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))} />
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={SO_STATUSES} placeholder="Trạng thái" />
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả chủ hàng' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} placeholder="Chủ hàng" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead className="w-8"></TableHead>
              <TableHead>Mã SO</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Ngày giao</TableHead>
              <TableHead align="right">KL dự kiến</TableHead>
              <TableHead align="right">KL đã giao</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={9} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={9} message="Chưa có Đơn bán hàng nào" /> : null}
            {!isLoading && rows.map((so) => (
              <>
                <TableRow key={so.id} onClick={() => toggleExpand(so.id)} className="cursor-pointer">
                  <TableCell>
                    {expandedId === so.id ? <ChevronUp className="h-4 w-4 text-navy-400" /> : <ChevronDown className="h-4 w-4 text-navy-400" />}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-navy-900">{so.soNumber}</p>
                      <p className="text-xs text-navy-400">{so._count?.lines || 0} dòng · {so._count?.shipmentHeaders || 0} shipment</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-800">{so.customer?.customerName || '—'}</p>
                    <p className="text-xs text-navy-400">{so.customer?.customerCode || ''}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-navy-700">{so.owner?.ownerCode || '—'}</p>
                    <p className="text-xs text-navy-400">{so.owner?.ownerName || ''}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-navy-700">{fmtDate(so.expectedDeliveryDate)}</p>
                  </TableCell>
                  <TableCell align="right" className="font-semibold text-navy-900">
                    {fmtKg(so.totalExpectedQtyKg)} kg
                  </TableCell>
                  <TableCell align="right">
                    <span className={Number(so.totalShippedQtyKg) > 0 ? 'font-semibold text-emerald-600' : 'text-navy-400'}>
                      {fmtKg(so.totalShippedQtyKg)} kg
                    </span>
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={statusVariant(so.status)}>{statusLabel(so.status)}</Badge>
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {so.status === 'DRAFT' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(so)} title="Chỉnh sửa">
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="accent" size="sm" onClick={() => confirmSo.mutate(so.id)} title="Xác nhận">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setShowCancel(so.id); setCancelReason({ reasonCode: '', note: '' }) }} title="Hủy">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {so.status === 'CONFIRMED' && (
                        <Button variant="ghost" size="sm" onClick={() => { setShowCancel(so.id); setCancelReason({ reasonCode: '', note: '' }) }} title="Hủy">
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {so.status === 'SHIPPED' && (
                        <Button variant="outline" size="sm" onClick={() => closeSo.mutate({ id: so.id, data: {} })} title="Đóng SO">
                          <Lock className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {['PARTIALLY_RELEASED', 'FULLY_RELEASED'].includes(so.status) && (
                        <span className="text-xs text-navy-400 flex items-center gap-1"><Ship className="h-3 w-3" /> Đang xuất</span>
                      )}
                      {['CLOSED', 'CANCELLED'].includes(so.status) && (
                        <span className="text-xs text-navy-400">Đã kết thúc</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {expandedId === so.id && (
                  <tr key={`${so.id}-lines`}>
                    <td colSpan={9} className="p-0">
                      <div className="bg-moon-50/70 border-t border-b border-moon-200 px-6 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="h-4 w-4 text-ice" />
                          <h4 className="text-sm font-semibold text-navy-900">Chi tiết SO — {so.soNumber}</h4>
                          {so.notes && <span className="text-xs text-navy-400 ml-2">({so.notes})</span>}
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-navy-400 border-b border-moon-200">
                              <th className="pb-2 pr-3">#</th>
                              <th className="pb-2 pr-3">Mặt hàng</th>
                              <th className="pb-2 pr-3">Hình thức</th>
                              <th className="pb-2 pr-3">ĐVT</th>
                              <th className="pb-2 pr-3 text-right">KL dự kiến</th>
                              <th className="pb-2 pr-3 text-right">KL đã xuất</th>
                              <th className="pb-2 pr-3 text-right">KL đã giao</th>
                              <th className="pb-2 pr-3">Ghi chú</th>
                              <th className="pb-2 text-center">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(so.lines || []).map((line) => (
                              <tr key={line.id} className="border-b border-moon-100 last:border-b-0">
                                <td className="py-2 pr-3 text-navy-400">{line.lineNumber}</td>
                                <td className="py-2 pr-3">
                                  <p className="font-medium text-navy-800">{line.item?.itemCode || line.itemId}</p>
                                  <p className="text-xs text-navy-400">{line.item?.itemName || ''}</p>
                                </td>
                                <td className="py-2 pr-3 text-navy-600">{line.cargoForm}</td>
                                <td className="py-2 pr-3 text-navy-600">{line.uom?.uomCode || ''}</td>
                                <td className="py-2 pr-3 text-right font-medium text-navy-900">{fmtKg(line.expectedQtyKg)}</td>
                                <td className="py-2 pr-3 text-right">
                                  <span className={Number(line.releasedQtyKg) > 0 ? 'font-medium text-blue-600' : 'text-navy-400'}>
                                    {fmtKg(line.releasedQtyKg)}
                                  </span>
                                </td>
                                <td className="py-2 pr-3 text-right">
                                  <span className={Number(line.shippedQtyKg) > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                                    {fmtKg(line.shippedQtyKg)}
                                  </span>
                                </td>
                                <td className="py-2 pr-3 text-navy-500 text-xs">{line.notes || '—'}</td>
                                <td className="py-2 text-center">
                                  <Badge variant={statusVariant(line.status)} className="text-xs">{line.status}</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-moon-300 font-semibold text-navy-900">
                              <td colSpan={4} className="pt-2 pr-3">Tổng</td>
                              <td className="pt-2 pr-3 text-right">{fmtKg(so.totalExpectedQtyKg)}</td>
                              <td className="pt-2 pr-3 text-right text-blue-600">{fmtKg(so.totalReleasedQtyKg)}</td>
                              <td className="pt-2 pr-3 text-right text-emerald-600">{fmtKg(so.totalShippedQtyKg)}</td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      {/* ── Create SO Modal ── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Tạo Đơn bán hàng" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Mã SO <span className="text-xs text-navy-400 font-normal">(Tự động)</span></label>
              <div className="flex items-center gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2">
                <Sparkles className="h-4 w-4 text-ice shrink-0" />
                <span className="font-mono font-semibold text-navy-900">{nextSoNumber || '...'}</span>
              </div>
            </div>
            <Input label="Mã SO ngoài (KH)" value={draft.externalSoNumber} onChange={(e) => setDraft((p) => ({ ...p, externalSoNumber: e.target.value }))} placeholder="VD: CUST-PO-2026-001" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Owner *" value={draft.ownerId} onChange={(e) => setDraft((p) => ({ ...p, ownerId: e.target.value }))} options={ownerOptions} />
            <Select label="Khách hàng *" value={draft.customerId} onChange={(e) => setDraft((p) => ({ ...p, customerId: e.target.value }))} options={customerOptions} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Kho *" value={draft.warehouseId} onChange={(e) => setDraft((p) => ({ ...p, warehouseId: e.target.value }))} options={warehouseOptions} />
            <Input label="Ngày giao dự kiến" type="date" value={draft.expectedDeliveryDate} onChange={(e) => setDraft((p) => ({ ...p, expectedDeliveryDate: e.target.value }))} />
          </div>
          <Input label="Địa chỉ giao hàng" value={draft.deliveryAddress} onChange={(e) => setDraft((p) => ({ ...p, deliveryAddress: e.target.value }))} />
          <Textarea label="Ghi chú" rows={2} value={draft.notes} onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))} />

          <div className="border-t border-moon-200 pt-4">
            {renderLineEditor(draft.lines, updateDraftLine, addDraftLine, removeDraftLine)}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-moon-200">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createSo.isPending || !draft.ownerId || !draft.customerId || !draft.warehouseId}>
              {createSo.isPending ? 'Đang tạo...' : 'Tạo SO'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Edit SO Modal ── */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={editDraft ? `Chỉnh sửa ${editDraft.soNumber}` : 'Chỉnh sửa SO'} size="lg">
        {editDraft && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Mã SO</label>
                <Input value={editDraft.soNumber || ''} disabled className="bg-navy-50 font-mono" />
              </div>
              <Input label="Mã SO ngoài (KH)" value={editDraft.externalSoNumber} onChange={(e) => setEditDraft((p) => ({ ...p, externalSoNumber: e.target.value }))} placeholder="VD: CUST-PO-2026-001" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Khách hàng" value={editDraft.customerId} onChange={(e) => setEditDraft((p) => ({ ...p, customerId: e.target.value }))} options={customerOptions} />
              <Input label="Ngày giao dự kiến" type="date" value={editDraft.expectedDeliveryDate} onChange={(e) => setEditDraft((p) => ({ ...p, expectedDeliveryDate: e.target.value }))} />
            </div>
            <Input label="Địa chỉ giao hàng" value={editDraft.deliveryAddress} onChange={(e) => setEditDraft((p) => ({ ...p, deliveryAddress: e.target.value }))} />
            <Textarea label="Ghi chú" rows={2} value={editDraft.notes} onChange={(e) => setEditDraft((p) => ({ ...p, notes: e.target.value }))} />

            <div className="border-t border-moon-200 pt-4">
              {renderLineEditor(editDraft.lines, updateEditLine, addEditLine, removeEditLine)}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-moon-200">
              <Button variant="outline" onClick={() => setShowEdit(false)}>Hủy</Button>
              <Button variant="accent" onClick={handleUpdate} disabled={updateSo.isPending}>
                {updateSo.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Cancel SO Modal ── */}
      <Modal
        isOpen={!!showCancel}
        onClose={() => setShowCancel(null)}
        title="Hủy đơn bán hàng"
        description="Nhập lý do hủy SO. SO đã có shipment sẽ không thể hủy."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCancel(null)}>Đóng</Button>
            <Button variant="danger" onClick={handleCancel} disabled={cancelSo.isPending || !cancelReason.reasonCode}>
              {cancelSo.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Mã lý do *" value={cancelReason.reasonCode} onChange={(e) => setCancelReason((p) => ({ ...p, reasonCode: e.target.value }))} placeholder="VD: CUSTOMER_REQUEST" />
          <Textarea label="Ghi chú" rows={2} value={cancelReason.note} onChange={(e) => setCancelReason((p) => ({ ...p, note: e.target.value }))} />
        </div>
      </Modal>
    </>
  )
}
