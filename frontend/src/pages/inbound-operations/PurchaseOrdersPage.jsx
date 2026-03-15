import React, { useState, useCallback } from 'react'
import { FileText, Plus, Trash2, Check, X as XIcon, Lock, Ban, ChevronDown, ChevronUp, Package, Sparkles, Pencil } from 'lucide-react'
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useConfirmPurchaseOrder,
  useClosePurchaseOrder,
  useCancelPurchaseOrder,
  useNextPoNumber,
} from '@domains/inbound-operations'
import { useLookupOwners, useLookupVendors, useLookupWarehouses, useLookupItems, useLookupUoms } from '@domains/master-data'
import {
  Badge, Button, Input, Modal, Pagination, Select,
  Table, TableBody, TableCell, TableEmpty, TableHead,
  TableHeader, TableLoading, TableRow, Textarea,
} from '@shared/ui'

const PO_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'NEW', label: 'Tạo mới' },
  { value: 'CONFIRMED', label: 'Xác nhận' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const statusTone = (status) => {
  if (status === 'NEW') return 'info'
  if (status === 'CONFIRMED') return 'success'
  if (status === 'CLOSED') return 'default'
  if (status === 'CANCELLED') return 'danger'
  return 'warning'
}

const getStatusLabel = (status) => {
  const statusMap = {
    'NEW': 'Tạo mới',
    'CONFIRMED': 'Xác nhận',
    'CLOSED': 'Đã đóng',
    'CANCELLED': 'Đã hủy'
  }
  return statusMap[status] || status
}

const emptyLine = { itemId: '', expectedQty: '', receivedQty: 0, uomId: '', status: 'OPEN', notes: '' }

const PO_TYPES = [
  { value: 'SEA', label: 'Nhập đường thủy' },
  { value: 'LAND', label: 'Nhập đường bộ' },
]

const emptyDraft = {
  poType: 'SEA',
  ownerId: '',
  vendorId: '',
  warehouseId: '',
  vesselName: '',
  origin: '',
  blNumber: '',
  notes: '',
  lines: [{ ...emptyLine }],
}

export function PurchaseOrdersPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', status: '', ownerId: '', vendorId: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [editDraft, setEditDraft] = useState(null)

  const { data: nextPoResponse } = useNextPoNumber(showCreate)
  const nextPoNumber = nextPoResponse?.data?.code || ''

  const { data: response, isLoading, refetch } = usePurchaseOrders({
    ...filters,
    keyword: filters.keyword || undefined,
    status: filters.status || undefined,
    ownerId: filters.ownerId || undefined,
    vendorId: filters.vendorId || undefined,
  })

  const createPo = useCreatePurchaseOrder()
  const updatePo = useUpdatePurchaseOrder()
  const confirmPo = useConfirmPurchaseOrder()
  const closePo = useClosePurchaseOrder()
  const cancelPo = useCancelPurchaseOrder()

  const { data: owners = [] } = useLookupOwners()
  const { data: vendors = [] } = useLookupVendors()
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
      poType: draft.poType,
      ownerId: draft.ownerId,
      vendorId: draft.vendorId,
      warehouseId: draft.warehouseId,
      notes: draft.notes || '',
      vesselName: draft.poType === 'SEA' ? draft.vesselName || '' : '',
      origin: draft.poType === 'SEA' ? draft.origin || '' : '',
      blNumber: draft.poType === 'SEA' ? draft.blNumber || '' : '',
      lines: draft.lines.filter((l) => l.itemId).map((l) => ({
        itemId: l.itemId,
        expectedQty: Number(l.expectedQty || 0),
        uomId: l.uomId || '',
        notes: l.notes || '',
      })),
    }
    await createPo.mutateAsync(payload)
    setDraft(emptyDraft)
    setShowCreate(false)
  }

  const handleOpenEdit = (po) => {
    setEditDraft({
      id: po.id,
      poNumber: po.poNumber,
      poType: po.poType || 'SEA',
      ownerId: po.ownerId,
      vendorId: po.vendorId,
      warehouseId: po.warehouseId,
      vesselName: po.vesselName || '',
      origin: po.origin || '',
      blNumber: po.blNumber || '',
      notes: po.notes || '',
      rowVersion: po.rowVersion ?? 0,
      lines: po.lines.map((l) => ({
        id: l.id,
        itemId: l.itemId,
        expectedQty: l.expectedQty,
        receivedQty: l.receivedQty || 0,
        uomId: l.uomId,
        notes: l.notes || '',
        status: l.status || 'NEW',
      })),
    })
    setShowEdit(true)
  }

  const handleUpdate = async () => {
    if (!editDraft) return
    const payload = {
      poType: editDraft.poType,
      ownerId: editDraft.ownerId,
      vendorId: editDraft.vendorId,
      warehouseId: editDraft.warehouseId,
      vesselName: editDraft.poType === 'SEA' ? editDraft.vesselName || '' : '',
      origin: editDraft.poType === 'SEA' ? editDraft.origin || '' : '',
      blNumber: editDraft.poType === 'SEA' ? editDraft.blNumber || '' : '',
      notes: editDraft.notes || '',
      rowVersion: editDraft.rowVersion ?? 0,
      lines: editDraft.lines.filter((l) => l.itemId).map((l) => ({
        id: l.id || undefined,
        itemId: l.itemId,
        expectedQty: Number(l.expectedQty || 0),
        uomId: l.uomId || '',
        notes: l.notes || '',
      })),
    }
    await updatePo.mutateAsync({ id: editDraft.id, data: payload })
    setEditDraft(null)
    setShowEdit(false)
  }

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id))

  const itemOptions = [{ value: '', label: '-- Chọn mặt hàng --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]
  const uomOptions = uoms.map((u) => ({ value: u.id, label: u.code }))

  const lineStatusTone = (status) => {
    if (status === 'RECEIVED') return 'success'
    if (status === 'PARTIAL') return 'warning'
    return 'info'
  }

  // ── Render line editor (table format) ──
  const renderLineEditor = (lines, updateFn, addFn, removeFn, isEdit = false) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-navy-900">Chi tiết các dòng hàng</h4>
        <Button variant="outline" size="sm" onClick={addFn}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm dòng
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-moon-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-moon-50 text-left text-xs font-semibold text-navy-600 uppercase tracking-wide">
              <th className="px-3 py-2.5 w-12 text-center">STT</th>
              <th className="px-3 py-2.5 min-w-[180px]">Mặt hàng (Item)*</th>
              <th className="px-3 py-2.5 w-28 text-center">SL dự kiến*</th>
              <th className="px-3 py-2.5 w-24 text-center">SL đã nhận</th>
              <th className="px-3 py-2.5 w-24 text-center">ĐVT</th>
              <th className="px-3 py-2.5 w-20 text-center">Trạng thái</th>
              <th className="px-3 py-2.5 min-w-[120px]">Ghi chú</th>
              <th className="px-3 py-2.5 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-moon-100">
            {lines.map((line, idx) => (
              <tr key={idx} className="bg-white hover:bg-moon-50/50">
                <td className="px-3 py-2 text-center text-navy-500 font-medium">{idx + 1}</td>
                <td className="px-3 py-2">
                  <Select
                    value={line.itemId}
                    onChange={(e) => updateFn(idx, 'itemId', e.target.value)}
                    options={itemOptions}
                    className="min-w-[160px]"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    value={line.expectedQty}
                    onChange={(e) => updateFn(idx, 'expectedQty', e.target.value)}
                    className="text-center"
                    min={0}
                  />
                </td>
                <td className="px-3 py-2 text-center text-navy-400">
                  {isEdit ? line.receivedQty || 0 : 0}
                </td>
                <td className="px-3 py-2">
                  <Select
                    value={line.uomId}
                    onChange={(e) => updateFn(idx, 'uomId', e.target.value)}
                    options={[{ value: '', label: '--' }, ...uomOptions]}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <Badge variant={lineStatusTone(line.status)} className="text-xs">
                    {line.status === 'OPEN' ? 'Mới' : line.status === 'RECEIVED' ? 'Đã nhận' : line.status === 'PARTIAL' ? 'Nhận 1 phần' : line.status}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={line.notes}
                    onChange={(e) => updateFn(idx, 'notes', e.target.value)}
                    placeholder="Ghi chú..."
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  {lines.length > 1 && (
                    <button onClick={() => removeFn(idx)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Purchase Orders</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={() => { setDraft(emptyDraft); setShowCreate(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Tạo PO
          </Button>
          <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input placeholder="Tìm PO number, ghi chú..." value={filters.keyword} onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 1 }))} />
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={PO_STATUSES} placeholder="Status" />
          <Select value={filters.ownerId} onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả Owner' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]} placeholder="Owner" />
          <Select value={filters.vendorId} onChange={(e) => setFilters((prev) => ({ ...prev, vendorId: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả Vendor' }, ...vendors.map((v) => ({ value: v.id, label: `${v.code} - ${v.name}` }))]} placeholder="Vendor" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead className="w-8"></TableHead>
              <TableHead>Số PO</TableHead>
              <TableHead>Loại PO</TableHead>
              <TableHead>Số B/L</TableHead>
              <TableHead>Chủ hàng</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead align="right">SL dự kiến</TableHead>
              <TableHead align="right">SL đã nhận</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={9} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={9} message="Chưa có Purchase Order nào" /> : null}
            {!isLoading && rows.map((po) => (
              <React.Fragment key={po.id}>
                <TableRow>
                  <TableCell>
                    <button onClick={() => toggleExpand(po.id)} className="p-1 text-navy-400 hover:text-ice">
                      {expandedId === po.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-navy-900">{po.poNumber}</p>
                      <p className="text-xs text-navy-400">{po.lines?.length || 0} dòng</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={po.poType === 'SEA' ? 'info' : 'warning'} className="text-xs">
                      {po.poType === 'SEA' ? 'Đường biển' : 'Đường bộ'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-navy-600">{po.blNumber || 'N/A'}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-navy-800">{po.owner?.ownerCode || po.ownerId}</p>
                      <p className="text-xs text-navy-400">{po.owner?.ownerName}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {po.createdAt ? new Date(po.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </TableCell>
                  <TableCell align="right" className="font-medium text-navy-900">{(po.totalExpectedQty || 0).toLocaleString()} kg</TableCell>
                  <TableCell align="right">
                    <span className={po.totalReceivedQty > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                      {(po.totalReceivedQty || 0).toLocaleString()} kg
                    </span>
                  </TableCell>
                  <TableCell><Badge variant={statusTone(po.status)}>{getStatusLabel(po.status)}</Badge></TableCell>
                  <TableCell align="center">
                    <div className="flex items-center justify-center gap-1">
                      {po.status === 'NEW' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(po)} title="Chỉnh sửa">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="accent" size="sm" onClick={() => confirmPo.mutate(po.id)} title="Xác nhận">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => cancelPo.mutate(po.id)} title="Hủy">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {po.status === 'CONFIRMED' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => closePo.mutate(po.id)} title="Đóng PO">
                            <Lock className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => cancelPo.mutate(po.id)} title="Hủy">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {['CLOSED', 'CANCELLED'].includes(po.status) && (
                        <span className="text-xs text-navy-400">Finalized</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {expandedId === po.id && (
                  <tr key={`${po.id}-lines`}>
                    <td colSpan={9} className="p-0">
                      <div className="bg-moon-50/70 border-t border-b border-moon-200 px-6 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="h-4 w-4 text-ice" />
                          <h4 className="text-sm font-semibold text-navy-900">Chi tiết dòng hàng — {po.poNumber}</h4>
                          {po.externalPoNumber && <span className="text-xs text-navy-400 ml-2">(B/L: {po.externalPoNumber})</span>}
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-navy-400 border-b border-moon-200">
                              <th className="pb-2 pr-3">#</th>
                              <th className="pb-2 pr-3">Mặt hàng</th>
                              <th className="pb-2 pr-3">ĐVT</th>
                              <th className="pb-2 pr-3 text-right">SL dự kiến</th>
                              <th className="pb-2 pr-3 text-right">SL đã nhận</th>
                              <th className="pb-2 pr-3 text-right">Đơn giá</th>
                              <th className="pb-2 pr-3 text-right">Thành tiền</th>
                              <th className="pb-2 text-center">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(po.lines || []).map((line) => (
                              <tr key={line.id} className="border-b border-moon-100 last:border-b-0">
                                <td className="py-2 pr-3 text-navy-400">{line.lineNum}</td>
                                <td className="py-2 pr-3">
                                  <p className="font-medium text-navy-800">{line.item?.itemCode || line.itemId}</p>
                                  <p className="text-xs text-navy-400">{line.item?.itemName || ''}</p>
                                </td>
                                <td className="py-2 pr-3 text-navy-600">{line.uom?.uomCode || line.uomId}</td>
                                <td className="py-2 pr-3 text-right font-medium text-navy-900">{(line.expectedQty || 0).toLocaleString()}</td>
                                <td className="py-2 pr-3 text-right">
                                  <span className={line.receivedQty > 0 ? 'font-medium text-emerald-600' : 'text-navy-400'}>
                                    {(line.receivedQty || 0).toLocaleString()}
                                  </span>
                                </td>
                                <td className="py-2 pr-3 text-right text-navy-600">{(line.unitPrice || 0).toLocaleString()}</td>
                                <td className="py-2 pr-3 text-right font-medium text-navy-800">
                                  {((line.expectedQty || 0) * (line.unitPrice || 0)).toLocaleString()}
                                </td>
                                <td className="py-2 text-center">
                                  <Badge variant={line.status === 'RECEIVED' ? 'success' : line.status === 'PARTIAL' ? 'warning' : 'default'} className="text-xs">
                                    {line.status === 'OPEN' ? 'Mới' : line.status === 'RECEIVED' ? 'Đã nhận' : line.status === 'PARTIAL' ? 'Nhận 1 phần' : line.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-moon-300 font-semibold text-navy-900">
                              <td colSpan={3} className="pt-2 pr-3">Tổng</td>
                              <td className="pt-2 pr-3 text-right">{(po.totalExpectedQty || 0).toLocaleString()}</td>
                              <td className="pt-2 pr-3 text-right text-emerald-600">{(po.totalReceivedQty || 0).toLocaleString()}</td>
                              <td className="pt-2 pr-3"></td>
                              <td className="pt-2 pr-3 text-right">
                                {(po.lines || []).reduce((s, l) => s + (l.expectedQty || 0) * (l.unitPrice || 0), 0).toLocaleString()}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      {/* ── Create PO Modal ── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Tạo Purchase Order mới" size="xl">
        <div className="space-y-5">
          {/* Section 1: Thông tin chung */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-navy-800 border-b border-moon-200 pb-2">1. Thông tin chung</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Số PO <span className="text-xs text-navy-400 font-normal">(Tự động)</span></label>
                <div className="flex items-center gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2.5">
                  <Sparkles className="h-4 w-4 text-ice shrink-0" />
                  <span className="font-mono font-semibold text-navy-900">{nextPoNumber || '...'}</span>
                </div>
              </div>
              <Select
                label="Lệnh PO *"
                value={draft.poType}
                onChange={(e) => setDraft((p) => ({ ...p, poType: e.target.value }))}
                options={PO_TYPES}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Chủ hàng (Owner) *"
                value={draft.ownerId}
                onChange={(e) => setDraft((p) => ({ ...p, ownerId: e.target.value }))}
                options={[{ value: '', label: '-- Chọn Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
              />
              <Select
                label="Nhà vận tải (Vendor) *"
                value={draft.vendorId}
                onChange={(e) => setDraft((p) => ({ ...p, vendorId: e.target.value }))}
                options={[{ value: '', label: '-- Chọn Vendor --' }, ...vendors.map((v) => ({ value: v.id, label: `${v.code} - ${v.name}` }))]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Kho phân phối (Warehouse) *"
                value={draft.warehouseId}
                onChange={(e) => setDraft((p) => ({ ...p, warehouseId: e.target.value }))}
                options={[{ value: '', label: '-- Chọn Warehouse --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]}
              />
              <div></div>
            </div>
            <Textarea label="Ghi chú" rows={2} value={draft.notes} onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))} placeholder="Nhập ghi chú..." />
          </div>

          {/* Section 2: Tên tàu & nguồn gốc (chỉ hiện khi chọn đường thủy) */}
          {draft.poType === 'SEA' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-navy-800 border-b border-moon-200 pb-2">2. Tên tàu & nguồn gốc</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Tên tàu / Nguồn gốc"
                  value={draft.vesselName}
                  onChange={(e) => setDraft((p) => ({ ...p, vesselName: e.target.value }))}
                  placeholder="VD: MV OCEAN STAR"
                />
                <Input
                  label="Số BL"
                  value={draft.blNumber}
                  onChange={(e) => setDraft((p) => ({ ...p, blNumber: e.target.value }))}
                  placeholder="VD: BL-2026-RICE-001"
                />
              </div>
            </div>
          )}

          {/* Section 3: Chi tiết các dòng hàng */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-navy-800 border-b border-moon-200 pb-2">
              {draft.poType === 'SEA' ? '3.' : '2.'} Chi tiết các dòng hàng
            </h3>
            {renderLineEditor(draft.lines, updateDraftLine, addDraftLine, removeDraftLine)}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-moon-200">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button variant="accent" onClick={handleCreate} disabled={createPo.isPending || !draft.ownerId || !draft.vendorId || !draft.warehouseId}>
              {createPo.isPending ? 'Đang tạo...' : 'Tạo PO'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Edit PO Modal ── */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={editDraft ? `Chỉnh sửa ${editDraft.poNumber}` : 'Chỉnh sửa PO'} size="xl">
        {editDraft && (
          <div className="space-y-5">
            {/* Section 1: Thông tin chung */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-navy-800 border-b border-moon-200 pb-2">1. Thông tin chung</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">Số PO</label>
                  <div className="flex items-center gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2.5">
                    <Sparkles className="h-4 w-4 text-ice shrink-0" />
                    <span className="font-mono font-semibold text-navy-900">{editDraft.poNumber}</span>
                  </div>
                </div>
                <Select
                  label="Lệnh PO *"
                  value={editDraft.poType}
                  onChange={(e) => setEditDraft((p) => ({ ...p, poType: e.target.value }))}
                  options={PO_TYPES}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Chủ hàng (Owner) *"
                  value={editDraft.ownerId}
                  onChange={(e) => setEditDraft((p) => ({ ...p, ownerId: e.target.value }))}
                  options={[{ value: '', label: '-- Chọn Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
                />
                <Select
                  label="Nhà vận tải (Vendor) *"
                  value={editDraft.vendorId}
                  onChange={(e) => setEditDraft((p) => ({ ...p, vendorId: e.target.value }))}
                  options={[{ value: '', label: '-- Chọn Vendor --' }, ...vendors.map((v) => ({ value: v.id, label: `${v.code} - ${v.name}` }))]}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Kho phân phối (Warehouse) *"
                  value={editDraft.warehouseId}
                  onChange={(e) => setEditDraft((p) => ({ ...p, warehouseId: e.target.value }))}
                  options={[{ value: '', label: '-- Chọn Warehouse --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]}
                />
                <div></div>
              </div>
              <Textarea label="Ghi chú" rows={2} value={editDraft.notes} onChange={(e) => setEditDraft((p) => ({ ...p, notes: e.target.value }))} placeholder="Nhập ghi chú..." />
            </div>

            {/* Section 2: Tên tàu & nguồn gốc (chỉ hiện khi chọn đường thủy) */}
            {editDraft.poType === 'SEA' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-navy-800 border-b border-moon-200 pb-2">2. Tên tàu & nguồn gốc</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Tên tàu / Nguồn gốc"
                    value={editDraft.vesselName}
                    onChange={(e) => setEditDraft((p) => ({ ...p, vesselName: e.target.value }))}
                    placeholder="VD: MV OCEAN STAR"
                  />
                  <Input
                    label="Số BL"
                    value={editDraft.blNumber}
                    onChange={(e) => setEditDraft((p) => ({ ...p, blNumber: e.target.value }))}
                    placeholder="VD: BL-2026-RICE-001"
                  />
                </div>
              </div>
            )}

            {/* Section 3: Chi tiết các dòng hàng */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-navy-800 border-b border-moon-200 pb-2">
                {editDraft.poType === 'SEA' ? '3.' : '2.'} Chi tiết các dòng hàng
              </h3>
              {renderLineEditor(editDraft.lines, updateEditLine, addEditLine, removeEditLine, true)}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-moon-200">
              <Button variant="outline" onClick={() => setShowEdit(false)}>Hủy</Button>
              <Button variant="accent" onClick={handleUpdate} disabled={updatePo.isPending || !editDraft.ownerId || !editDraft.vendorId || !editDraft.warehouseId}>
                {updatePo.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
