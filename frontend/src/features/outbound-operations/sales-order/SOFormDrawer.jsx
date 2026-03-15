import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingCart, X, Plus, Trash2, Sparkles } from 'lucide-react'
import { Button, Input, Select, Textarea } from '@shared/ui'

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

export function SOFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false,
  nextSoNumber = '',
  owners = [],
  customers = [],
  warehouses = [],
  items = [],
  uoms = [],
}) {
  const isEdit = !!initialData
  const [draft, setDraft] = useState({ ...emptyDraft, lines: [{ ...emptyLine }] })

  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      setDraft({
        ownerId: initialData.ownerId || '',
        customerId: initialData.customerId || '',
        warehouseId: initialData.warehouseId || '',
        externalSoNumber: initialData.externalSoNumber || '',
        expectedDeliveryDate: initialData.expectedDeliveryDate ? initialData.expectedDeliveryDate.slice(0, 10) : '',
        deliveryAddress: initialData.deliveryAddress || '',
        notes: initialData.notes || '',
        currency: initialData.currency || 'VND',
        lines: (initialData.lines || []).map((l) => ({
          itemId: l.itemId || '',
          expectedQty: Number(l.expectedQty || 0),
          uomId: l.uomId || '',
          unitPrice: l.unitPrice ? Number(l.unitPrice) : '',
          cargoForm: l.cargoForm || 'BULK',
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

  const handleSubmit = () => {
    if (isEdit) {
      onSubmit({
        customerId: draft.customerId || undefined,
        expectedDeliveryDate: draft.expectedDeliveryDate || undefined,
        deliveryAddress: draft.deliveryAddress || undefined,
        notes: draft.notes || undefined,
        externalSoNumber: draft.externalSoNumber || undefined,
        lines: draft.lines.filter((l) => l.itemId).map((l) => ({
          itemId: l.itemId,
          cargoForm: l.cargoForm,
          uomId: l.uomId,
          expectedQty: Number(l.expectedQty || 0),
          expectedQtyKg: Number(l.expectedQty || 0),
          unitPrice: l.unitPrice ? Number(l.unitPrice) : undefined,
          notes: l.notes || undefined,
        })),
      })
    } else {
      onSubmit({
        externalId: `SO-WEB-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
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
      })
    }
  }

  const isValid = isEdit
    ? draft.lines.some((l) => l.itemId)
    : !!(draft.ownerId && draft.customerId && draft.warehouseId && draft.lines.some((l) => l.itemId))

  const itemOptions = [{ value: '', label: '-- Chọn mặt hàng --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]
  const uomOptions = [{ value: '', label: '-- ĐVT --' }, ...uoms.map((u) => ({ value: u.id, label: `${u.code} - ${u.name}` }))]
  const ownerOptions = [{ value: '', label: '-- Chọn Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]
  const customerOptions = [{ value: '', label: '-- Chọn khách hàng --' }, ...customers.map((c) => ({ value: c.id, label: `${c.customerCode} - ${c.customerName}` }))]
  const warehouseOptions = [{ value: '', label: '-- Chọn Kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]

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
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    {isEdit ? `Chỉnh sửa ${initialData.soNumber}` : 'Tạo Đơn bán hàng mới'}
                  </h2>
                  <p className="text-sm text-navy-400">
                    {isEdit ? 'Cập nhật thông tin đơn bán hàng' : 'Nhập thông tin để tạo SO trong hệ thống'}
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
                      Mã SO <span className="font-normal text-navy-400">(Tự động)</span>
                    </label>
                    <div className="flex h-10 items-center gap-2 rounded-xl border-2 border-moon-200 bg-moon-50 px-4">
                      <Sparkles className="h-4 w-4 shrink-0 text-ice" />
                      <span className="font-mono text-sm font-semibold text-navy-700">
                        {isEdit ? initialData.soNumber : (nextSoNumber || '—')}
                      </span>
                    </div>
                  </div>
                  <Input
                    label="Mã SO ngoài (khách hàng)"
                    value={draft.externalSoNumber}
                    onChange={(e) => setDraft((p) => ({ ...p, externalSoNumber: e.target.value }))}
                    placeholder="VD: CUST-PO-2026-001"
                  />
                </div>

                {!isEdit && (
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Owner *"
                      value={draft.ownerId}
                      onChange={(e) => setDraft((p) => ({ ...p, ownerId: e.target.value }))}
                      options={ownerOptions}
                    />
                    <Select
                      label="Kho *"
                      value={draft.warehouseId}
                      onChange={(e) => setDraft((p) => ({ ...p, warehouseId: e.target.value }))}
                      options={warehouseOptions}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Khách hàng *"
                    value={draft.customerId}
                    onChange={(e) => setDraft((p) => ({ ...p, customerId: e.target.value }))}
                    options={customerOptions}
                  />
                  <Input
                    label="Ngày giao dự kiến"
                    type="date"
                    value={draft.expectedDeliveryDate}
                    onChange={(e) => setDraft((p) => ({ ...p, expectedDeliveryDate: e.target.value }))}
                  />
                </div>

                <Input
                  label="Địa chỉ giao hàng"
                  value={draft.deliveryAddress}
                  onChange={(e) => setDraft((p) => ({ ...p, deliveryAddress: e.target.value }))}
                  placeholder="Nhập địa chỉ giao hàng..."
                />

                <Textarea
                  label="Ghi chú"
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Nhập ghi chú..."
                />
              </div>

              {/* Section 2: Danh sách mặt hàng */}
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">2</span>
                    <h3 className="text-sm font-semibold text-navy-800">Danh sách mặt hàng</h3>
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

                      <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-3 items-end">
                        <Select
                          label="Mặt hàng *"
                          value={line.itemId}
                          onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                          options={itemOptions}
                        />
                        <Select
                          label="Đơn vị tính *"
                          value={line.uomId}
                          onChange={(e) => updateLine(idx, 'uomId', e.target.value)}
                          options={uomOptions}
                        />
                        <Select
                          label="Hình thức hàng"
                          value={line.cargoForm}
                          onChange={(e) => updateLine(idx, 'cargoForm', e.target.value)}
                          options={CARGO_FORMS}
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

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <Input
                          label="Số lượng (kg) *"
                          type="number"
                          min={0}
                          value={line.expectedQty}
                          onChange={(e) => updateLine(idx, 'expectedQty', e.target.value)}
                        />
                        <Input
                          label="Đơn giá"
                          type="number"
                          min={0}
                          value={line.unitPrice}
                          onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)}
                          placeholder="Tuỳ chọn"
                        />
                      </div>

                      <div className="mt-2">
                        <Input
                          value={line.notes}
                          onChange={(e) => updateLine(idx, 'notes', e.target.value)}
                          placeholder="Ghi chú dòng hàng (tuỳ chọn)..."
                        />
                      </div>
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
                    ? <span className="font-medium text-emerald-600">✓ {draft.lines.filter((l) => l.itemId).length} dòng hàng sẵn sàng</span>
                    : '* Owner, Khách hàng, Kho và ít nhất 1 mặt hàng là bắt buộc'}
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
