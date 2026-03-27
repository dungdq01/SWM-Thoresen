import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Receipt, X } from 'lucide-react'
import { Button, Input, Select } from '@shared/ui'

const emptyDraft = {
  ownerId: '',
  warehouseId: '',
  periodStart: '',
  periodEnd: '',
}

export function InvoiceFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  owners = [],
  warehouses = [],
}) {
  const [draft, setDraft] = useState({ ...emptyDraft })

  useEffect(() => {
    if (isOpen) setDraft({ ...emptyDraft })
  }, [isOpen])

  const set = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }))

  const dateValid = !draft.periodStart || !draft.periodEnd || draft.periodStart <= draft.periodEnd
  const isValid = !!(draft.ownerId && draft.warehouseId && draft.periodStart && draft.periodEnd && dateValid)

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      ...draft,
      externalId: `DN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    })
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
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[100vw] sm:max-w-lg flex-col bg-white shadow-2xl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800">
                  <Receipt className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-navy-900">Tạo phiếu nợ</h2>
                  <p className="text-xs text-navy-400">Tổng hợp sự kiện billing theo kỳ hạn</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-moon-100 hover:text-navy-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Chủ sở hữu *"
                  value={draft.ownerId}
                  onChange={(e) => set('ownerId', e.target.value)}
                  options={[{ value: '', label: '-- Chọn chủ sở hữu --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
                />
                <Select
                  label="Kho *"
                  value={draft.warehouseId}
                  onChange={(e) => set('warehouseId', e.target.value)}
                  options={[{ value: '', label: '-- Chọn kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]}
                />
              </div>

              <div className="rounded-xl border border-moon-200 bg-moon-50/60 p-4 space-y-4">
                <p className="text-sm font-semibold text-navy-800">Kỳ hạn thanh toán</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Ngày bắt đầu *"
                    type="date"
                    value={draft.periodStart}
                    onChange={(e) => set('periodStart', e.target.value)}
                  />
                  <Input
                    label="Ngày kết thúc *"
                    type="date"
                    value={draft.periodEnd}
                    onChange={(e) => set('periodEnd', e.target.value)}
                  />
                </div>
                {!dateValid && (
                  <p className="text-xs text-danger">Ngày kết thúc phải sau ngày bắt đầu</p>
                )}
                {draft.periodStart && draft.periodEnd && dateValid && (
                  <p className="text-xs text-navy-500">
                    Kỳ hạn: {new Date(draft.periodStart).toLocaleDateString('vi-VN')} → {new Date(draft.periodEnd).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-moon-200 bg-moon-50/80 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-navy-400">
                  {isValid
                    ? <span className="text-success font-medium">✓ Sẵn sàng tạo phiếu nợ</span>
                    : 'Chọn chủ sở hữu, kho và kỳ hạn thanh toán'}
                </p>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={onClose}>Hủy</Button>
                  <Button variant="accent" onClick={handleSubmit} disabled={!isValid || isLoading}>
                    {isLoading ? 'Đang xử lý...' : 'Tạo phiếu nợ'}
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
