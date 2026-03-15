import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Truck, X, Plus, Trash2, Sparkles } from 'lucide-react'
import { Button, Input, Select } from '@shared/ui'

const CARGO_FORMS = [
  { value: 'BULK', label: 'Hàng rời' },
  { value: 'BAGGED_25KG', label: 'Bao 25kg' },
  { value: 'BAGGED_40KG', label: 'Bao 40kg' },
  { value: 'BAGGED_50KG', label: 'Bao 50kg' },
  { value: 'JUMBO', label: 'Jumbo' },
]

const SOURCE_TYPES = [
  { value: 'STANDALONE', label: 'Độc lập (Standalone)' },
  { value: 'SO', label: 'Từ Đơn bán hàng (SO)' },
]

const emptyLine = { itemId: '', cargoForm: 'BULK', uomId: '', expectedQty: '', bagCount: '', nominalWeightPerBag: '' }

const emptyDraft = {
  sourceType: 'STANDALONE',
  soId: '',
  ownerId: '',
  customerId: '',
  warehouseId: '',
  vehicleNumber: '',
  lines: [{ ...emptyLine }],
}

export function OutboundShipmentFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  owners = [],
  customers = [],
  warehouses = [],
  items = [],
  uoms = [],
  salesOrders = [],
  soDetail = null,
  onSoSelect = null,
}) {
  const [draft, setDraft] = useState({ ...emptyDraft, lines: [{ ...emptyLine }] })
  const [selectedSoId, setSelectedSoId] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setDraft({ ...emptyDraft, lines: [{ ...emptyLine }] })
      setSelectedSoId(null)
    }
  }, [isOpen])

  // Auto-fill from SO detail
  useEffect(() => {
    if (!soDetail || !selectedSoId) return
    const so = soDetail.salesOrder || soDetail
    const soLines = so.lines || []
    setDraft((prev) => ({
      ...prev,
      soId: so.soNumber || selectedSoId,
      ownerId: so.ownerId || prev.ownerId,
      customerId: so.customerId || prev.customerId,
      warehouseId: so.warehouseId || prev.warehouseId,
      lines: soLines.length > 0
        ? soLines.map((l) => ({
            itemId: l.itemId || '',
            cargoForm: l.cargoForm || 'BULK',
            uomId: l.uomId || '',
            expectedQty: String(Number(l.expectedQtyKg || l.expectedQty || 0)),
            bagCount: l.bagCount ? String(l.bagCount) : '',
            nominalWeightPerBag: l.nominalWeightPerBag ? String(l.nominalWeightPerBag) : '',
          }))
        : [{ ...emptyLine }],
    }))
  }, [soDetail, selectedSoId])

  const set = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }))

  const handleSoSelect = (soId) => {
    if (soId) {
      setSelectedSoId(soId)
      setDraft((p) => ({ ...p, sourceType: 'SO', soId }))
      onSoSelect?.(soId)
    } else {
      setSelectedSoId(null)
      setDraft((p) => ({ ...p, sourceType: 'STANDALONE', soId: '', ownerId: '', customerId: '', warehouseId: '', lines: [{ ...emptyLine }] }))
      onSoSelect?.(null)
    }
  }

  const updateLine = useCallback((idx, field, value) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    }))
  }, [])

  const addLine = () => setDraft((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }))
  const removeLine = (idx) => setDraft((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }))

  const isValid = !!(draft.ownerId && draft.warehouseId && draft.vehicleNumber && draft.lines.some((l) => l.itemId))
  const validLines = draft.lines.filter((l) => l.itemId)

  const handleSubmit = () => {
    if (!isValid) return
    const payload = {
      externalId: `SHP-WEB-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      sourceType: draft.sourceType || 'STANDALONE',
      soId: draft.soId || undefined,
      ownerId: draft.ownerId,
      customerId: draft.customerId || undefined,
      warehouseId: draft.warehouseId,
      vehicleNumber: draft.vehicleNumber,
      lines: draft.lines.filter((l) => l.itemId).map((l) => ({
        itemId: l.itemId,
        cargoForm: l.cargoForm,
        uomId: l.uomId || undefined,
        expectedQty: Number(l.expectedQty || 0),
        expectedQtyKg: Number(l.expectedQty || 0),
        bagCount: l.bagCount ? Number(l.bagCount) : undefined,
        nominalWeightPerBag: l.nominalWeightPerBag ? Number(l.nominalWeightPerBag) : undefined,
      })),
    }
    onSubmit(payload)
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-navy-950/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800">
                  <Truck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-navy-900">Tạo chuyến hàng xuất</h2>
                  <p className="text-xs text-navy-400">Outbound Shipment</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-moon-100 hover:text-navy-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Section 1 — Thông tin chung */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">1</span>
                  <h3 className="text-sm font-semibold text-navy-900">Thông tin chung</h3>
                </div>

                {/* Shipment number (auto) */}
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">
                    Mã Shipment <span className="text-xs text-navy-400 font-normal">(Tự động)</span>
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-moon-200 bg-moon-50 px-3 py-2.5">
                    <Sparkles className="h-4 w-4 text-ice shrink-0" />
                    <span className="font-mono text-sm text-navy-500">Hệ thống tự sinh khi tạo</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Loại nguồn *"
                    value={draft.sourceType}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v !== 'SO') handleSoSelect('')
                      set('sourceType', v)
                    }}
                    options={SOURCE_TYPES}
                  />
                  {draft.sourceType === 'SO' && (
                    <Select
                      label="Đơn bán hàng (SO)"
                      value={selectedSoId || ''}
                      onChange={(e) => handleSoSelect(e.target.value)}
                      options={[{ value: '', label: '-- Không chọn --' }, ...salesOrders.map((so) => ({ value: so.id, label: `${so.soNumber} — ${so.customer?.customerName || 'N/A'}` }))]}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Owner *"
                    value={draft.ownerId}
                    onChange={(e) => set('ownerId', e.target.value)}
                    options={[{ value: '', label: '-- Chọn Owner --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
                  />
                  <Select
                    label="Khách hàng"
                    value={draft.customerId}
                    onChange={(e) => set('customerId', e.target.value)}
                    options={[{ value: '', label: '-- Chọn khách hàng --' }, ...customers.map((c) => ({ value: c.id, label: `${c.customerCode} - ${c.customerName}` }))]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Kho *"
                    value={draft.warehouseId}
                    onChange={(e) => set('warehouseId', e.target.value)}
                    options={[{ value: '', label: '-- Chọn Kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]}
                  />
                  <Input
                    label="Biển số xe *"
                    value={draft.vehicleNumber}
                    onChange={(e) => set('vehicleNumber', e.target.value)}
                    placeholder="VD: 51C-123.45"
                  />
                </div>
              </div>

              {/* Section 2 — Mặt hàng */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">2</span>
                    <h3 className="text-sm font-semibold text-navy-900">Danh sách mặt hàng</h3>
                  </div>
                  <button
                    onClick={addLine}
                    className="flex items-center gap-1.5 rounded-lg border border-ice/40 bg-ice/8 px-3 py-1.5 text-xs font-medium text-ice-dark hover:bg-ice/15 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm dòng
                  </button>
                </div>

                {draft.lines.map((line, idx) => (
                  <div key={idx} className="group relative rounded-xl border border-moon-200 bg-moon-50/50 p-4 hover:border-ice/40 transition-colors">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-700 text-[10px] font-bold text-white">{idx + 1}</span>
                      {draft.lines.length > 1 && (
                        <button onClick={() => removeLine(idx)} className="flex h-6 w-6 items-center justify-center rounded-lg text-navy-300 hover:bg-danger/10 hover:text-danger transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Select label="Mặt hàng *" value={line.itemId} onChange={(e) => updateLine(idx, 'itemId', e.target.value)} options={[{ value: '', label: '-- Chọn mặt hàng --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]} />
                      <Select label="Đơn vị tính" value={line.uomId} onChange={(e) => updateLine(idx, 'uomId', e.target.value)} options={[{ value: '', label: '-- Đơn vị --' }, ...uoms.map((u) => ({ value: u.id, label: `${u.code}` }))]} />
                      <Select label="Hình thức hàng" value={line.cargoForm} onChange={(e) => updateLine(idx, 'cargoForm', e.target.value)} options={CARGO_FORMS} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <Input label="Số lượng (kg) *" type="number" value={line.expectedQty} onChange={(e) => updateLine(idx, 'expectedQty', e.target.value)} placeholder="0" />
                      <Input label="Số bao" type="number" value={line.bagCount} onChange={(e) => updateLine(idx, 'bagCount', e.target.value)} placeholder="0" />
                      <Input label="Trọng lượng/bao (kg)" type="number" value={line.nominalWeightPerBag} onChange={(e) => updateLine(idx, 'nominalWeightPerBag', e.target.value)} placeholder="0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-moon-200 bg-moon-50/80 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-navy-400">
                  {isValid
                    ? <span className="text-success font-medium">✓ {validLines.length} dòng hàng sẵn sàng</span>
                    : 'Điền Owner, Kho, Biển số xe và ít nhất 1 mặt hàng'}
                </p>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={onClose}>Hủy</Button>
                  <Button variant="accent" onClick={handleSubmit} disabled={!isValid || isLoading}>
                    {isLoading ? 'Đang tạo...' : 'Tạo Shipment'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
