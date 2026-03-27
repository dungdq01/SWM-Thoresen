import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, X, Plus, Trash2, Sparkles, Ship, Truck } from 'lucide-react'
import { Button, Input, Select, MultiSelect, Textarea } from '@shared/ui'
import { useLookupItemGroupIdsByWarehouses } from '@domains/master-data'

const PO_TYPES = [
  { value: 'SEA', label: 'Nhập đường thủy' },
  { value: 'LAND', label: 'Nhập đường bộ' },
]

const emptyLine = { itemId: '', expectedQty: '', uomId: '', notes: '' }

const parseVehiclePlates = (input) => {
  if (!input) return []
  return input
    .split(/[,|;]+/)
    .map((plate) => plate.trim())
    .filter((plate) => plate.length > 0)
    .filter((plate, i, arr) => arr.indexOf(plate) === i)
}

const emptyDraft = {
  poType: 'SEA',
  ownerId: '',
  vendorId: '',
  warehouseIds: [],
  vesselName: '',
  blNumber: '',
  vehiclePlate: '',
  notes: '',
  lines: [{ ...emptyLine }],
}

export function POFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false,
  nextPoNumber = '',
  owners = [],
  vendors = [],
  warehouses = [],
  items = [],
  uoms = [],
  vessels = [],
}) {
  const isEdit = !!initialData
  const [draft, setDraft] = useState({ ...emptyDraft, lines: [{ ...emptyLine }] })

  // Lấy danh sách itemGroupIds được phép theo kho đã chọn
  const { data: allowedGroupIds = [] } = useLookupItemGroupIdsByWarehouses(draft.warehouseIds)

  // Filter items: chỉ hiện items thuộc nhóm hàng được phép ở kho đã chọn
  const filteredItems = useMemo(() => {
    if (draft.warehouseIds.length === 0) return items
    if (allowedGroupIds.length === 0) return []
    return items.filter((i) => i.extra?.itemGroupId && allowedGroupIds.includes(i.extra.itemGroupId))
  }, [items, draft.warehouseIds, allowedGroupIds])

  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      // Extract warehouseIds from warehouses relation or fallback to single warehouseId
      const warehouseIds = initialData.warehouses?.length
        ? initialData.warehouses.map((w) => w.warehouse?.id || w.warehouseId)
        : (initialData.warehouseId ? [initialData.warehouseId] : [])
      setDraft({
        poType: initialData.poType || 'SEA',
        ownerId: initialData.ownerId || '',
        vendorId: initialData.vendorId || '',
        warehouseIds,
        vesselName: initialData.vesselName || '',
        blNumber: initialData.blNumber || '',
        vehiclePlate: initialData.vehiclePlate || '',
        notes: initialData.notes || '',
        lines: (initialData.lines || []).map((l) => ({
          id: l.id,
          itemId: l.itemId || '',
          expectedQty: l.expectedQty || '',
          receivedQty: l.receivedQty || 0,
          uomId: l.uomId || '',
          status: l.status || 'OPEN',
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
      lines: prev.lines.map((l, i) => {
        if (i !== idx) return l
        const updated = { ...l, [field]: value }
        // Autofill UOM khi chọn mặt hàng
        if (field === 'itemId' && value) {
          const selectedItem = items.find((it) => it.id === value)
          if (selectedItem?.extra?.baseUomId) {
            updated.uomId = selectedItem.extra.baseUomId
          }
        }
        return updated
      }),
    }))
  }, [items])

  const addLine = useCallback(() => {
    setDraft((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }))
  }, [])

  const removeLine = useCallback((idx) => {
    setDraft((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }))
  }, [])

  const handleSubmit = () => {
    const payload = {
      poType: draft.poType,
      ownerId: draft.ownerId,
      vendorId: draft.vendorId,
      warehouseIds: draft.warehouseIds,
      notes: draft.notes || '',
      vesselName: draft.vesselName || '',
      blNumber: draft.blNumber || '',
      vehiclePlate: draft.vehiclePlate || '',
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

  const vehiclePlates = parseVehiclePlates(draft.vehiclePlate)
  const hasMultipleVehicles = vehiclePlates.length > 1

  const isSeaTransportValid = draft.poType !== 'SEA' || (draft.vesselName && draft.blNumber)
  const isLandTransportValid = draft.poType !== 'LAND' || !!draft.vehiclePlate.trim()
  const isValid = !!(draft.ownerId && draft.vendorId && draft.warehouseIds.length > 0 && draft.lines.some((l) => l.itemId) && isSeaTransportValid && isLandTransportValid)

  const itemOptions = [{ value: '', label: draft.warehouseIds.length === 0 ? '-- Chọn kho trước --' : '-- Chọn mặt hàng --' }, ...filteredItems.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]
  const uomOptions = [{ value: '', label: '--' }, ...uoms.map((u) => ({ value: u.id, label: u.code }))]

  const sectionNum = (n) => draft.poType === 'SEA' ? n : n - 1

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
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[100vw] sm:max-w-xl md:max-w-2xl flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-ice-light">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    {isEdit ? `Chỉnh sửa ${initialData.poNumber}` : 'Tạo Purchase Order mới'}
                  </h2>
                  <p className="text-sm text-navy-400">
                    {isEdit ? 'Cập nhật thông tin đơn đặt hàng' : 'Nhập thông tin để tạo PO trong hệ thống'}
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
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                      Số PO <span className="font-normal text-navy-400">(Tự động)</span>
                    </label>
                    <div className="flex h-10 items-center gap-2 rounded-xl border-2 border-moon-200 bg-moon-50 px-4">
                      <Sparkles className="h-4 w-4 shrink-0 text-ice" />
                      <span className="font-mono text-sm font-semibold text-navy-700">
                        {isEdit ? initialData.poNumber : (nextPoNumber || '—')}
                      </span>
                    </div>
                  </div>
                  <Select
                    label="Loại vận chuyển *"
                    value={draft.poType}
                    onChange={(e) => setDraft((p) => ({ ...p, poType: e.target.value }))}
                    options={PO_TYPES}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Chủ hàng (Owner) *"
                    value={draft.ownerId}
                    onChange={(e) => setDraft((p) => ({ ...p, ownerId: e.target.value, warehouseIds: [] }))}
                    options={[{ value: '', label: '-- Chọn Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
                  />
                  <Select
                    label="Nhà vận tải (Vendor) *"
                    value={draft.vendorId}
                    onChange={(e) => setDraft((p) => ({ ...p, vendorId: e.target.value }))}
                    options={[{ value: '', label: '-- Chọn Vendor --' }, ...vendors.map((v) => ({ value: v.id, label: `${v.code} - ${v.name}` }))]}
                  />
                </div>

                <MultiSelect
                  label="Kho hàng *"
                  value={draft.warehouseIds}
                  onChange={(values) => setDraft((p) => ({ ...p, warehouseIds: values, lines: [{ ...emptyLine }] }))}
                  options={warehouses
                    .filter((w) => !draft.ownerId || w.extra?.ownerId === draft.ownerId)
                    .map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
                  placeholder={draft.ownerId ? '-- Chọn kho --' : '-- Chọn chủ hàng trước --'}
                  disabled={!draft.ownerId}
                />

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
                  {draft.poType === 'SEA' ? (
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
                    label={draft.poType === 'SEA' ? 'Tên tàu / Nguồn gốc *' : 'Tên tàu / Nguồn gốc'}
                    value={draft.vesselName}
                    onChange={(e) => setDraft((p) => ({ ...p, vesselName: e.target.value }))}
                    options={[{ value: '', label: '-- Chọn tàu --' }, ...vessels.map((v) => ({ value: v.name, label: `${v.code} - ${v.name}` }))]}
                  />
                  <Input
                    label={draft.poType === 'SEA' ? 'Số BL *' : 'Số BL'}
                    value={draft.blNumber}
                    onChange={(e) => setDraft((p) => ({ ...p, blNumber: e.target.value }))}
                    placeholder="VD: BL-2026-RICE-001"
                  />
                </div>
                <div>
                  <Input
                    label={draft.poType === 'LAND' ? 'Biển số xe *' : 'Biển số xe'}
                    value={draft.vehiclePlate}
                    onChange={(e) => setDraft((p) => ({ ...p, vehiclePlate: e.target.value }))}
                    placeholder="VD: 29A-11111; 29A-12345"
                    hint={hasMultipleVehicles ? '' : 'Dùng dấu , hoặc ; để tách nhiều xe'}
                  />
                  {hasMultipleVehicles && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
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
                        → Khi tạo phiếu nhập sẽ tách {vehiclePlates.length} phiếu
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3/2: Chi tiết dòng hàng */}
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">3</span>
                    <h3 className="text-sm font-semibold text-navy-800">Chi tiết dòng hàng</h3>
                    <span className="rounded-full bg-moon-100 px-2 py-0.5 text-xs font-medium text-navy-500">
                      {draft.lines.filter((l) => l.itemId).length}/{draft.lines.length} dòng
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={addLine}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Thêm dòng
                  </Button>
                </div>

                <div className="space-y-2">
                  {draft.lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-xl border border-moon-200 bg-moon-50/50 px-4 pb-3 pt-4 transition-colors hover:border-moon-300"
                    >
                      <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-navy-700 text-[10px] font-bold text-white shadow-sm">
                        {idx + 1}
                      </span>

                      <div className="grid grid-cols-[1fr_120px_96px_40px] gap-3 items-end">
                        <Select
                          label="Mặt hàng *"
                          value={line.itemId}
                          onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                          options={itemOptions}
                        />
                        <Input
                          label="SL dự kiến *"
                          type="number"
                          min={0}
                          value={line.expectedQty}
                          onChange={(e) => updateLine(idx, 'expectedQty', e.target.value)}
                          className="text-center"
                        />
                        <Select
                          label="ĐVT"
                          value={line.uomId}
                          onChange={(e) => updateLine(idx, 'uomId', e.target.value)}
                          options={uomOptions}
                          disabled={!!line.itemId}
                        />
                        <div className="flex items-end pb-0.5">
                          {draft.lines.length > 1 ? (
                            <button
                              onClick={() => removeLine(idx)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-navy-300 transition-colors hover:bg-danger/10 hover:text-danger"
                              title="Xóa dòng"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <div className="h-10 w-10" />
                          )}
                        </div>
                      </div>

                      <div className="mt-2">
                        <Input
                          value={line.notes}
                          onChange={(e) => updateLine(idx, 'notes', e.target.value)}
                          placeholder="Ghi chú dòng hàng (tuỳ chọn)..."
                        />
                      </div>

                      {isEdit && (
                        <p className="mt-1.5 text-xs text-navy-400">
                          Đã nhận: <span className="font-semibold text-emerald-600">{line.receivedQty || 0}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-navy-400">
                  {isValid
                    ? <span className="text-emerald-600 font-medium">✓ {draft.lines.filter((l) => l.itemId).length} dòng hàng sẵn sàng</span>
                    : '* Chủ hàng, Vendor, Kho và ít nhất 1 mặt hàng là bắt buộc'}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} disabled={isLoading}>Hủy</Button>
                  <Button variant="accent" onClick={handleSubmit} isLoading={isLoading} disabled={!isValid}>
                    {isEdit ? 'Lưu thay đổi' : 'Tạo PO'}
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
