import { useState, useCallback } from 'react'
import { FileText, Plus, Trash2, Check, Lock, Ban, ChevronDown, ChevronUp, Package } from 'lucide-react'
import {
  useSalesOrders,
  useCreateSalesOrder,
  useUpdateSalesOrder,
  useConfirmSalesOrder,
  useCloseSalesOrder,
  useCancelSalesOrder,
} from '@domains/outbound-operations'
import { useLookupOwners, useLookupWarehouses, useLookupItems, useLookupUoms } from '@domains/master-data'
import {
  Badge, Button, Input, Modal, Pagination, Select,
  Table, TableBody, TableCell, TableEmpty, TableHead,
  TableHeader, TableLoading, TableRow, Textarea,
} from '@shared/ui'

const SO_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const CARGO_FORMS = [
  { value: 'BULK', label: 'BULK' },
  { value: 'BAGGED_25KG', label: 'BAGGED_25KG' },
  { value: 'BAGGED_50KG', label: 'BAGGED_50KG' },
  { value: 'JUMBO_1000KG', label: 'JUMBO_1000KG' },
]

const statusTone = (status) => {
  if (status === 'CONFIRMED') return 'success'
  if (status === 'CLOSED') return 'default'
  if (status === 'CANCELLED') return 'danger'
  if (status === 'SHIPPED') return 'success'
  return 'warning'
}

const emptyLine = { itemId: '', expectedQty: '', uomId: '', unitPrice: '', cargoForm: 'BULK', notes: '' }

const emptyDraft = {
  ownerId: '',
  customerId: '',
  customerName: '',
  warehouseId: '',
  requestedDeliveryDate: '',
  notes: '',
  currency: 'VND',
  lines: [{ ...emptyLine }],
}

export function SalesOrdersPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', status: '', ownerId: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [editDraft, setEditDraft] = useState(null)

  const { data: response, isLoading, refetch } = useSalesOrders({
    ...filters,
    keyword: filters.keyword || undefined,
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

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

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

  // ── Actions ──
  const handleCreate = async () => {
    const payload = {
      ...draft,
      lines: draft.lines.filter((l) => l.itemId).map((l) => ({
        ...l,
        expectedQty: Number(l.expectedQty || 0),
        unitPrice: Number(l.unitPrice || 0),
      })),
    }
    await createSo.mutateAsync(payload)
    setDraft(emptyDraft)
    setShowCreate(false)
  }

  const handleOpenEdit = (so) => {
    setEditDraft({
      id: so.id,
      ownerId: so.ownerId,
      customerId: so.customerId,
      customerName: so.customerName,
      warehouseId: so.warehouseId,
      requestedDeliveryDate: so.requestedDeliveryDate || '',
      notes: so.notes || '',
      currency: so.currency || 'VND',
      lines: so.lines.map((l) => ({
        id: l.id,
        itemId: l.itemId,
        expectedQty: l.expectedQty,
        shippedQty: l.shippedQty,
        uomId: l.uomId,
        unitPrice: l.unitPrice,
        cargoForm: l.cargoForm || 'BULK',
        notes: l.notes || '',
        status: l.status,
      })),
    })
    setShowEdit(true)
  }

  const handleUpdate = async () => {
    if (!editDraft) return
    const payload = {
      ...editDraft,
      lines: editDraft.lines.filter((l) => l.itemId).map((l) => ({
        ...l,
        expectedQty: Number(l.expectedQty || 0),
        unitPrice: Number(l.unitPrice || 0),
        shippedQty: Number(l.shippedQty || 0),
      })),
    }
    await updateSo.mutateAsync({ id: editDraft.id, data: payload })
    setEditDraft(null)
    setShowEdit(false)
  }

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id))

  const itemOptions = [{ value: '', label: '-- Chọn Item --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]
  const uomOptions = [{ value: '', label: '-- UoM --' }, ...uoms.map((u) => ({ value: u.id, label: `${u.code} - ${u.name}` }))]

  // ── Render line editor ──
  const renderLineEditor = (lines, updateFn, addFn, removeFn) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-navy-900">SO Lines</h4>
        <Button variant="outline" size="sm" onClick={addFn}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm dòng
        </Button>
      </div>
      {lines.map((line, idx) => (
        <div key={idx} className="rounded-xl border border-moon-200 p-3 space-y-2 bg-moon-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-navy-400">Line {idx + 1}</span>
            {lines.length > 1 && (
              <button onClick={() => removeFn(idx)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Select label="Mặt hàng *" value={line.itemId} onChange={(e) => updateFn(idx, 'itemId', e.target.value)} options={itemOptions} />
            <Select label="Đơn vị tính" value={line.uomId} onChange={(e) => updateFn(idx, 'uomId', e.target.value)} options={uomOptions} />
            <Select label="Cargo form" value={line.cargoForm} onChange={(e) => updateFn(idx, 'cargoForm', e.target.value)} options={CARGO_FORMS} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Số lượng dự kiến (kg) *" type="number" value={line.expectedQty} onChange={(e) => updateFn(idx, 'expectedQty', e.target.value)} />
            <Input label="Đơn giá" type="number" value={line.unitPrice} onChange={(e) => updateFn(idx, 'unitPrice', e.target.value)} />
            <Input label="Ghi chú dòng" value={line.notes} onChange={(e) => updateFn(idx, 'notes', e.target.value)} />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Sales Orders</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(emptyDraft); setShowCreate(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Tạo SO
          </Button>
          <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input placeholder="Tìm SO number, khách hàng, ghi chú..." value={filters.keyword} onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 1 }))} />
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={SO_STATUSES} placeholder="Status" />
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả Owner' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} placeholder="Owner" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead className="w-8"></TableHead>
              <TableHead>SO Number</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead align="right">Expected Qty</TableHead>
              <TableHead align="right">Shipped Qty</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={9} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={9} message="Chưa có Sales Order nào" /> : null}
            {!isLoading && rows.map((so) => (
              <>
                <TableRow key={so.id} onClick={() => toggleExpand(so.id)} className="cursor-pointer">
                  <TableCell>
                    {expandedId === so.id ? <ChevronUp className="h-4 w-4 text-navy-400" /> : <ChevronDown className="h-4 w-4 text-navy-400" />}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-navy-900">{so.soNumber}</p>
                      <p className="text-xs text-navy-400">{so.lines?.length || 0} lines</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-navy-800">{so.customerName || so.customerId || '—'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-navy-700">{so.owner?.ownerCode || so.ownerId}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-navy-700">{so.requestedDeliveryDate || '—'}</p>
                  </TableCell>
                  <TableCell align="right" className="font-semibold text-navy-900">
                    {(so.totalExpectedQty || 0).toLocaleString()} kg
                  </TableCell>
                  <TableCell align="right">
                    <span className={so.totalShippedQty > 0 ? 'font-semibold text-emerald-600' : 'text-navy-400'}>
                      {(so.totalShippedQty || 0).toLocaleString()} kg
                    </span>
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant={statusTone(so.status)}>{so.status}</Badge>
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
                          <Button variant="ghost" size="sm" onClick={() => cancelSo.mutate(so.id)} title="Hủy">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {so.status === 'CONFIRMED' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => closeSo.mutate(so.id)} title="Đóng SO">
                            <Lock className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => cancelSo.mutate(so.id)} title="Hủy">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {['CLOSED', 'CANCELLED'].includes(so.status) && (
                        <span className="text-xs text-navy-400">Finalized</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* ── Expanded lines ── */}
                {expandedId === so.id && (
                  <tr key={`${so.id}-lines`}>
                    <td colSpan={9} className="p-0">
                      <div className="bg-moon-50/70 border-t border-b border-moon-200 px-6 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="h-4 w-4 text-ice" />
                          <h4 className="text-sm font-semibold text-navy-900">SO Lines — {so.soNumber}</h4>
                          {so.notes && <span className="text-xs text-navy-400 ml-2">({so.notes})</span>}
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-navy-400 border-b border-moon-200">
                              <th className="pb-2 pr-3">#</th>
                              <th className="pb-2 pr-3">Item</th>
                              <th className="pb-2 pr-3">Cargo Form</th>
                              <th className="pb-2 pr-3">UoM</th>
                              <th className="pb-2 pr-3 text-right">Expected</th>
                              <th className="pb-2 pr-3 text-right">Shipped</th>
                              <th className="pb-2 pr-3 text-right">Unit Price</th>
                              <th className="pb-2 pr-3 text-right">Amount</th>
                              <th className="pb-2 pr-3">Notes</th>
                              <th className="pb-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(so.lines || []).map((line) => (
                              <tr key={line.id} className="border-b border-moon-100 last:border-b-0">
                                <td className="py-2 pr-3 text-navy-400">{line.lineNum}</td>
                                <td className="py-2 pr-3">
                                  <p className="font-medium text-navy-800">{line.item?.itemCode || line.itemId}</p>
                                  <p className="text-xs text-navy-400">{line.item?.itemName || ''}</p>
                                </td>
                                <td className="py-2 pr-3 text-navy-600">{line.cargoForm}</td>
                                <td className="py-2 pr-3 text-navy-600">{line.uom?.uomCode || line.uomId}</td>
                                <td className="py-2 pr-3 text-right font-medium text-navy-900">{(line.expectedQty || 0).toLocaleString()}</td>
                                <td className="py-2 pr-3 text-right">
                                  <span className={line.shippedQty > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                                    {(line.shippedQty || 0).toLocaleString()}
                                  </span>
                                </td>
                                <td className="py-2 pr-3 text-right text-navy-600">{(line.unitPrice || 0).toLocaleString()}</td>
                                <td className="py-2 pr-3 text-right font-medium text-navy-800">
                                  {((line.expectedQty || 0) * (line.unitPrice || 0)).toLocaleString()}
                                </td>
                                <td className="py-2 pr-3 text-navy-500 text-xs">{line.notes || '—'}</td>
                                <td className="py-2 text-center">
                                  <Badge variant={statusTone(line.status)} className="text-xs">{line.status}</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-moon-300 font-semibold text-navy-900">
                              <td colSpan={4} className="pt-2 pr-3">Tổng</td>
                              <td className="pt-2 pr-3 text-right">{(so.totalExpectedQty || 0).toLocaleString()}</td>
                              <td className="pt-2 pr-3 text-right text-emerald-600">{(so.totalShippedQty || 0).toLocaleString()}</td>
                              <td className="pt-2 pr-3"></td>
                              <td className="pt-2 pr-3 text-right">
                                {(so.lines || []).reduce((s, l) => s + (l.expectedQty || 0) * (l.unitPrice || 0), 0).toLocaleString()}
                              </td>
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
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tạo Sales Order mới"
        description="Phiếu xuất hàng bao gồm Header và Lines chi tiết."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createSo.isPending}>
              {createSo.isPending ? 'Đang xử lý...' : 'Tạo SO'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Owner *" value={draft.ownerId} onChange={(e) => setDraft((p) => ({ ...p, ownerId: e.target.value }))} options={[{ value: '', label: '-- Chọn Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
            <Select label="Warehouse *" value={draft.warehouseId} onChange={(e) => setDraft((p) => ({ ...p, warehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn Warehouse --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Mã khách hàng" value={draft.customerId} onChange={(e) => setDraft((p) => ({ ...p, customerId: e.target.value }))} />
            <Input label="Tên khách hàng *" value={draft.customerName} onChange={(e) => setDraft((p) => ({ ...p, customerName: e.target.value }))} />
          </div>
          <Input label="Ngày giao hàng yêu cầu" type="date" value={draft.requestedDeliveryDate} onChange={(e) => setDraft((p) => ({ ...p, requestedDeliveryDate: e.target.value }))} />
          <Textarea label="Ghi chú" rows={2} value={draft.notes} onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))} />

          <div className="border-t border-moon-200 pt-4">
            {renderLineEditor(draft.lines, updateDraftLine, addDraftLine, removeDraftLine)}
          </div>
        </div>
      </Modal>

      {/* ── Edit SO Modal ── */}
      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title="Chỉnh sửa Sales Order"
        description="Cập nhật thông tin header và lines."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEdit(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleUpdate} disabled={updateSo.isPending}>
              {updateSo.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </>
        }
      >
        {editDraft && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select label="Owner *" value={editDraft.ownerId} onChange={(e) => setEditDraft((p) => ({ ...p, ownerId: e.target.value }))} options={[{ value: '', label: '-- Chọn Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} />
              <Select label="Warehouse *" value={editDraft.warehouseId} onChange={(e) => setEditDraft((p) => ({ ...p, warehouseId: e.target.value }))} options={[{ value: '', label: '-- Chọn Warehouse --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Mã khách hàng" value={editDraft.customerId} onChange={(e) => setEditDraft((p) => ({ ...p, customerId: e.target.value }))} />
              <Input label="Tên khách hàng *" value={editDraft.customerName} onChange={(e) => setEditDraft((p) => ({ ...p, customerName: e.target.value }))} />
            </div>
            <Input label="Ngày giao hàng yêu cầu" type="date" value={editDraft.requestedDeliveryDate} onChange={(e) => setEditDraft((p) => ({ ...p, requestedDeliveryDate: e.target.value }))} />
            <Textarea label="Ghi chú" rows={2} value={editDraft.notes} onChange={(e) => setEditDraft((p) => ({ ...p, notes: e.target.value }))} />

            <div className="border-t border-moon-200 pt-4">
              {renderLineEditor(editDraft.lines, updateEditLine, addEditLine, removeEditLine)}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
