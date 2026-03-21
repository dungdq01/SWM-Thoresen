import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, Input, Select } from '@shared/ui'
import { Split, X, Plus, Trash2 } from 'lucide-react'

export function GoodsSplitCreateDrawer({ isOpen, onClose, onSubmit, isLoading, owners = [], items = [], warehouses = [], uoms = [], receipts = [] }) {
  const [form, setForm] = useState({
    sourceReceiptId: '',
    sourcePOId: '',
    itemId: '',
    warehouseId: '',
    totalQty: '',
    uomId: '',
    notes: '',
    details: [{ targetOwnerId: '', allocationPct: '' }],
  })

  useEffect(() => {
    if (isOpen) setForm({
      sourceReceiptId: '', sourcePOId: '', itemId: '', warehouseId: '',
      totalQty: '', uomId: '', notes: '',
      details: [{ targetOwnerId: '', allocationPct: '' }],
    })
  }, [isOpen])

  const receiptOptions = useMemo(() =>
    receipts.map(r => ({
      value: r.id,
      label: `${r.receiptNumber || 'Nháp'} — ${r.owner?.ownerCode || ''} — ${r.status}`,
    })),
    [receipts]
  )

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleReceiptChange = (receiptId) => {
    const receipt = receipts.find(r => r.id === receiptId)
    if (receipt) {
      setForm(prev => ({
        ...prev,
        sourceReceiptId: receiptId,
        sourcePOId: receipt.poId || '',
        warehouseId: receipt.warehouseId || '',
        totalQty: receipt.netWeightKg ? String(receipt.netWeightKg) : receipt.expectedQty ? String(receipt.expectedQty) : '',
      }))
    } else {
      handleChange('sourceReceiptId', receiptId)
    }
  }

  const handleDetailChange = (idx, field, value) => {
    setForm(prev => {
      const details = [...prev.details]
      details[idx] = { ...details[idx], [field]: value }
      return { ...prev, details }
    })
  }

  const addDetail = () => {
    setForm(prev => ({ ...prev, details: [...prev.details, { targetOwnerId: '', allocationPct: '' }] }))
  }

  const removeDetail = (idx) => {
    setForm(prev => ({ ...prev, details: prev.details.filter((_, i) => i !== idx) }))
  }

  const totalPct = form.details.reduce((sum, d) => sum + (Number(d.allocationPct) || 0), 0)

  const handleSubmit = () => {
    onSubmit({
      sourceReceiptId: form.sourceReceiptId,
      sourcePOId: form.sourcePOId || undefined,
      itemId: form.itemId,
      warehouseId: form.warehouseId,
      totalQty: Number(form.totalQty),
      uomId: form.uomId,
      notes: form.notes || undefined,
      details: form.details.map(d => ({
        targetOwnerId: d.targetOwnerId,
        allocationPct: Number(d.allocationPct),
      })),
    })
  }

  const isValid = form.sourceReceiptId && form.itemId && form.warehouseId && form.totalQty > 0
    && form.uomId && form.details.length > 0
    && form.details.every(d => d.targetOwnerId && d.allocationPct > 0)
    && Math.abs(totalPct - 100) < 0.1

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
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800">
                  <Split className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-navy-900">Tạo phiếu chia hàng</h2>
                  <p className="text-xs text-navy-400">Phân bổ hàng từ chủ ủy quyền sang chủ thực tế</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-moon-100 hover:text-navy-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Section 1 — Thông tin nguồn */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">1</span>
                  <h3 className="text-sm font-semibold text-navy-900">Thông tin nguồn</h3>
                </div>
                <Select
                  label="Phiếu nhập nguồn"
                  value={form.sourceReceiptId}
                  onChange={(e) => handleReceiptChange(e.target.value)}
                  options={receiptOptions}
                  placeholder="Chọn phiếu nhập"
                />
                <Input
                  label="Số PO (tùy chọn)"
                  placeholder="Mã PO gốc"
                  value={form.sourcePOId}
                  onChange={(e) => handleChange('sourcePOId', e.target.value)}
                />
              </div>

              {/* Section 2 — Hàng hóa */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">2</span>
                  <h3 className="text-sm font-semibold text-navy-900">Hàng hóa</h3>
                </div>
                <Select
                  label="Mặt hàng"
                  value={form.itemId}
                  onChange={(e) => handleChange('itemId', e.target.value)}
                  options={items.map(i => ({ value: i.id, label: `${i.itemCode || i.code} — ${i.itemName || i.name}` }))}
                  placeholder="Chọn mặt hàng"
                />
                <Select
                  label="Kho"
                  value={form.warehouseId}
                  onChange={(e) => handleChange('warehouseId', e.target.value)}
                  options={warehouses.map(w => ({ value: w.id, label: `${w.warehouseCode || w.code} — ${w.warehouseName || w.name}` }))}
                  placeholder="Chọn kho"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Tổng SL"
                    type="number"
                    placeholder="0"
                    value={form.totalQty}
                    onChange={(e) => handleChange('totalQty', e.target.value)}
                  />
                  <Select
                    label="Đơn vị tính"
                    value={form.uomId}
                    onChange={(e) => handleChange('uomId', e.target.value)}
                    options={uoms.map(u => ({ value: u.id, label: `${u.uomCode || u.code} — ${u.uomName || u.name}` }))}
                    placeholder="Chọn ĐVT"
                  />
                </div>
              </div>

              {/* Section 3 — Allocation */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">3</span>
                    <h3 className="text-sm font-semibold text-navy-900">Phân bổ chủ hàng</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${Math.abs(totalPct - 100) < 0.1 ? 'text-emerald-600' : 'text-red-500'}`}>
                      Tổng: {totalPct.toFixed(1)}%
                    </span>
                    <Button variant="ghost" size="sm" onClick={addDetail}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {form.details.map((detail, idx) => (
                  <div key={idx} className="flex items-end gap-2 p-3 rounded-lg bg-navy-50/50 border border-moon-200">
                    <div className="flex-1">
                      <Select
                        label={`Chủ hàng #${idx + 1}`}
                        value={detail.targetOwnerId}
                        onChange={(e) => handleDetailChange(idx, 'targetOwnerId', e.target.value)}
                        options={owners.map(o => ({ value: o.id, label: `${o.ownerCode || o.code} — ${o.ownerName || o.name}` }))}
                        placeholder="Chọn chủ hàng đích"
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        label="%"
                        type="number"
                        placeholder="0"
                        value={detail.allocationPct}
                        onChange={(e) => handleDetailChange(idx, 'allocationPct', e.target.value)}
                      />
                    </div>
                    {form.totalQty > 0 && detail.allocationPct > 0 && (
                      <div className="pb-2">
                        <p className="text-xs text-navy-400">
                          ≈ {((Number(form.totalQty) * Number(detail.allocationPct)) / 100).toLocaleString('vi-VN')} kg
                        </p>
                      </div>
                    )}
                    {form.details.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeDetail(idx)} className="pb-2">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Input
                label="Ghi chú"
                placeholder="Ghi chú thêm (tùy chọn)"
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-moon-200 px-6 py-4">
              <Button variant="outline" onClick={onClose}>Đóng</Button>
              <Button variant="accent" onClick={handleSubmit} disabled={!isValid || isLoading}>
                {isLoading ? 'Đang xử lý...' : 'Tạo phiếu chia hàng'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
