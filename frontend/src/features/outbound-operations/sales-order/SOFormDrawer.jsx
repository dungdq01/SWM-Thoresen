import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, X, Plus, Trash2, Sparkles, Ship, Truck } from 'lucide-react'
import { Badge, Button, Input, Select, Textarea } from '@shared/ui'
import { useOnHandList } from '@domains/inventory-core/hooks/useInventoryCore'

const SO_TYPES = [
  { value: 'SEA', label: 'Đường thủy' },
  { value: 'LAND', label: 'Đường bộ' },
]

const emptyLine = { itemId: '', expectedQty: '', shippedQty: 0, uomId: '', status: 'NEW', notes: '' }

const parseVehiclePlates = (input) => {
  if (!input) return []
  return input
    .split(/[,|;]+/)
    .map((plate) => plate.trim())
    .filter((plate) => plate.length > 0)
    .filter((plate, i, arr) => arr.indexOf(plate) === i)
}

const emptyDraft = {
  soType: 'SEA',
  ownerId: '',
  blNumber: '',
  vesselName: '',
  vehiclePlate: '',
  notes: '',
  lines: [{ ...emptyLine }],
}

export function SOFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false,
  nextSoNumber = '',
  owners = [],
  items = [],
  uoms = [],
  vessels = [],
}) {
  const isEdit = !!initialData
  const [draft, setDraft] = useState({ ...emptyDraft, lines: [{ ...emptyLine }] })

  // Query on-hand theo owner để filter items có tồn kho xuất được
  const { data: onHandData } = useOnHandList(
    draft.ownerId ? { ownerId: draft.ownerId, hasStock: true, pageSize: 100 } : {}
  )
  const ownerItemIds = useMemo(() => {
    if (!draft.ownerId || !onHandData?.data) return null // null = không filter
    const rows = onHandData.data
    const ids = new Set()
    for (const row of rows) {
      // Chỉ lấy items có trạng thái AVAILABLE (có thể xuất)
      if (row.inventDim?.inventoryStatus?.statusCode === 'AVAILABLE') {
        ids.add(row.itemId)
      }
    }
    return ids
  }, [draft.ownerId, onHandData])

  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      setDraft({
        soType: initialData.soType || 'SEA',
        ownerId: initialData.ownerId || '',
        blNumber: initialData.blNumber || '',
        vesselName: initialData.vesselName || '',
        vehiclePlate: initialData.vehiclePlate || '',
        notes: initialData.notes || '',
        lines: (initialData.lines || []).map((l) => ({
          id: l.id,
          itemId: l.itemId || '',
          expectedQty: Number(l.expectedQty || 0),
          shippedQty: Number(l.shippedQty || 0),
          uomId: l.uomId || '',
          status: l.status || 'NEW',
          notes: l.notes || '',
        })),
      })
    } else {
      setDraft({ ...emptyDraft, lines: [{ ...emptyLine }] })
    }
  }, [initialData, isOpen])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const updateLine = useCallback((idx, field, value) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    }))
  }, [])

  const addLine = useCallback(() => {
    setDraft((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }))
  }, [])

  const removeLine = useCallback((idx) => {
    setDraft((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }))
  }, [])

  const vehiclePlates = parseVehiclePlates(draft.vehiclePlate)
  const hasMultipleVehicles = vehiclePlates.length > 1

  const handleSubmit = () => {
    const payload = {
      soType: draft.soType,
      ownerId: draft.ownerId,
      blNumber: draft.blNumber,
      vesselName: draft.vesselName || '',
      vehiclePlate: draft.vehiclePlate || '',
      notes: draft.notes || '',
      lines: draft.lines.filter((l) => l.itemId).map((l) => ({
        ...(l.id ? { id: l.id } : {}),
        itemId: l.itemId,
        expectedQty: Number(l.expectedQty || 0),
        uomId: l.uomId || '',
        notes: l.notes || '',
      })),
    }
    if (isEdit) payload.rowVersion = initialData.rowVersion ?? 0
    onSubmit(payload)
  }

  const isSeaTransportValid = draft.soType !== 'SEA' || (draft.vesselName && draft.blNumber)
  const isLandTransportValid = draft.soType !== 'LAND' || !!draft.vehiclePlate.trim()
  const isValid = !!(draft.ownerId && draft.blNumber && draft.lines.some((l) => l.itemId && l.expectedQty) && isSeaTransportValid && isLandTransportValid)

  const filteredItems = ownerItemIds ? items.filter((i) => ownerItemIds.has(i.id)) : items
  const itemOptions = [{ value: '', label: '-- Chọn hàng hóa --' }, ...filteredItems.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]
  const uomOptions = [{ value: '', label: '--' }, ...uoms.map((u) => ({ value: u.id, label: u.code }))]
  const ownerOptions = [{ value: '', label: '-- Chọn chủ hàng --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]

  const lineStatusLabel = (status) => {
    const map = { NEW: 'Mới', PARTIAL: 'Xuất 1 phần', SHIPPED: 'Đã xuất', CANCELLED: 'Đã hủy' }
    return map[status] || status
  }

  const lineStatusVariant = (status) => {
    const map = { NEW: 'info', PARTIAL: 'warning', SHIPPED: 'success', CANCELLED: 'danger' }
    return map[status] || 'default'
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-ice-light">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    {isEdit ? `Chỉnh sửa ${initialData.soNumber}` : 'Tạo đơn xuất hàng mới'}
                  </h2>
                  <p className="text-sm text-navy-400">
                    {isEdit ? 'Cập nhật thông tin đơn xuất hàng' : 'Nhập thông tin để tạo SO trong hệ thống'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-moon-100">

              {/* Section 1: Thông tin chung */}
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">1</span>
                  <h3 className="text-sm font-semibold text-navy-800">Thông tin chung</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Loại SO *"
                    value={draft.soType}
                    onChange={(e) => setDraft((p) => ({ ...p, soType: e.target.value }))}
                    options={SO_TYPES}
                  />
                  <Select
                    label="Chủ hàng *"
                    value={draft.ownerId}
                    onChange={(e) => setDraft((p) => ({ ...p, ownerId: e.target.value }))}
                    options={ownerOptions}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Số B/L *"
                    value={draft.blNumber}
                    onChange={(e) => setDraft((p) => ({ ...p, blNumber: e.target.value }))}
                    placeholder="VD: BL-2026-RICE-001"
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                      Số SO <span className="font-normal text-navy-400">(Tự động)</span>
                    </label>
                    <div className="flex h-10 items-center gap-2 rounded-xl border-2 border-moon-200 bg-moon-50 px-4">
                      <Sparkles className="h-4 w-4 shrink-0 text-ice" />
                      <span className="font-mono text-sm font-semibold text-navy-700">
                        {isEdit ? initialData.soNumber : (nextSoNumber || '—')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  {draft.soType === 'SEA' ? (
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                      <Ship className="h-3 w-3" /> Đường thủy
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
                      <Truck className="h-3 w-3" /> Đường bộ
                    </span>
                  )}
                </div>

                <Textarea
                  label="Ghi chú"
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Nhập ghi chú..."
                />
              </div>

              {/* Section 2: Thông tin vận chuyển */}
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">2</span>
                  <h3 className="text-sm font-semibold text-navy-800">Thông tin vận chuyển</h3>
                  {draft.soType === 'SEA' ? (
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                      <Ship className="h-3 w-3" /> Đường biển
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                      <Truck className="h-3 w-3" /> Đường bộ
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label={draft.soType === 'SEA' ? 'Tên tàu *' : 'Tên tàu'}
                    value={draft.vesselName}
                    onChange={(e) => setDraft((p) => ({ ...p, vesselName: e.target.value }))}
                    options={[{ value: '', label: '-- Chọn tàu --' }, ...vessels.map((v) => ({ value: v.name, label: `${v.code} - ${v.name}` }))]}
                  />
                  <Input
                    label={draft.soType === 'LAND' ? 'Biển số xe *' : 'Biển số xe'}
                    value={draft.vehiclePlate}
                    onChange={(e) => setDraft((p) => ({ ...p, vehiclePlate: e.target.value }))}
                    placeholder="VD: 29A-11111; 29A-12345"
                    hint={hasMultipleVehicles ? '' : 'Dùng dấu , hoặc ; để tách nhiều xe'}
                  />
                </div>
                {hasMultipleVehicles && (
                  <div className="flex flex-wrap gap-1.5">
                    {vehiclePlates.map((plate, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-md bg-ice/10 px-2 py-1 text-xs font-medium text-ice"
                      >
                        <Truck className="h-3 w-3" />
                        {plate}
                      </span>
                    ))}
                    <span className="text-xs text-navy-400 self-center ml-1">
                      → Khi tạo phiếu xuất sẽ tách {vehiclePlates.length} phiếu
                    </span>
                  </div>
                )}
              </div>

              {/* Section 3: Chi tiết hàng hóa */}
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">3</span>
                    <h3 className="text-sm font-semibold text-navy-800">Chi tiết hàng hóa</h3>
                    <span className="rounded-full bg-moon-100 px-2 py-0.5 text-xs font-medium text-navy-500">
                      {draft.lines.filter((l) => l.itemId).length}/{draft.lines.length} dòng
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={addLine}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Thêm dòng
                  </Button>
                </div>

                {/* Table with horizontal scroll */}
                <div className="rounded-xl border border-moon-200 overflow-x-auto">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead>
                      <tr className="bg-moon-50 text-left text-xs text-navy-500 border-b border-moon-200">
                        <th className="px-3 py-2.5 w-12 whitespace-nowrap">STT</th>
                        <th className="px-3 py-2.5 min-w-[220px] whitespace-nowrap">Mã hàng hóa *</th>
                        <th className="px-3 py-2.5 w-28 text-right whitespace-nowrap">SL dự kiến *</th>
                        <th className="px-3 py-2.5 w-24 text-right whitespace-nowrap">SL đã xuất</th>
                        <th className="px-3 py-2.5 w-28 whitespace-nowrap">ĐVT</th>
                        <th className="px-3 py-2.5 w-24 text-center whitespace-nowrap">Trạng thái</th>
                        <th className="px-3 py-2.5 min-w-[180px] whitespace-nowrap">Ghi chú</th>
                        <th className="px-3 py-2.5 w-12 text-center whitespace-nowrap">Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.lines.map((line, idx) => (
                        <tr key={idx} className="border-b border-moon-100 last:border-b-0 hover:bg-moon-50/50">
                          <td className="px-3 py-2.5 text-center text-navy-400 font-medium">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <Select
                              value={line.itemId}
                              onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                              options={itemOptions}
                              className="min-w-[200px]"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <Input
                              type="number"
                              min={0}
                              value={line.expectedQty}
                              onChange={(e) => updateLine(idx, 'expectedQty', e.target.value)}
                              className="text-right w-24"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex h-10 w-20 items-center justify-end rounded-xl border border-moon-200 bg-moon-50 px-3 text-navy-400">
                              {line.shippedQty || 0}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <Select
                              value={line.uomId}
                              onChange={(e) => updateLine(idx, 'uomId', e.target.value)}
                              options={uomOptions}
                              className="min-w-[100px]"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge variant={lineStatusVariant(line.status)} className="text-xs whitespace-nowrap">
                              {lineStatusLabel(line.status)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            <Input
                              value={line.notes}
                              onChange={(e) => updateLine(idx, 'notes', e.target.value)}
                              placeholder="Ghi chú..."
                              className="min-w-[160px]"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {draft.lines.length > 1 ? (
                              <button
                                onClick={() => removeLine(idx)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-navy-300 transition-colors hover:bg-danger/10 hover:text-danger"
                                title="Xóa dòng"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <div className="h-8 w-8" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-navy-400">
                  {isValid
                    ? <span className="font-medium text-emerald-600">✓ {draft.lines.filter((l) => l.itemId).length} dòng hàng sẵn sàng</span>
                    : '* Loại SO, Chủ hàng, Số B/L, vận chuyển và ít nhất 1 mặt hàng là bắt buộc'}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} disabled={isLoading}>Hủy</Button>
                  <Button variant="accent" onClick={handleSubmit} isLoading={isLoading} disabled={!isValid}>
                    {isEdit ? 'Lưu thay đổi' : 'Tạo SO'}
                  </Button>
                </div>
              </div>
            </div>

          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
