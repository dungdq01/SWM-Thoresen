import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Zap, X } from 'lucide-react'
import { Button, Input, Select } from '@shared/ui'

const EVENT_TYPE_OPTIONS = [
  { value: 'INBOUND_HANDLING', label: 'Nhập hàng' },
  { value: 'OUTBOUND_HANDLING', label: 'Xuất hàng' },
  { value: 'BAGGING_FEE', label: 'Đóng gói' },
  { value: 'STORAGE', label: 'Lưu trữ' },
]

const emptyDraft = {
  eventType: '',
  ownerId: '',
  warehouseId: '',
  billingQtyMt: '',
  eventDate: new Date().toISOString().split('T')[0],
}

export function BillableEventFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  owners = [],
  warehouses = [],
}) {
  const [draft, setDraft] = useState({ ...emptyDraft })

  useEffect(() => {
    if (isOpen) setDraft({ ...emptyDraft, eventDate: new Date().toISOString().split('T')[0] })
  }, [isOpen])

  const set = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }))

  const isValid = !!(draft.eventType && draft.ownerId && draft.warehouseId && parseFloat(draft.billingQtyMt) > 0 && draft.eventDate)

  const handleSubmit = () => {
    if (!isValid) return
    const now = new Date().toISOString()
    onSubmit({
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
      correlationId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
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
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-navy-900">Tạo sự kiện thanh toán</h2>
                  <p className="text-xs text-navy-400">Ghi nhận thủ công sự kiện billing</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-moon-100 hover:text-navy-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <Select
                label="Loại sự kiện *"
                value={draft.eventType}
                onChange={(e) => set('eventType', e.target.value)}
                options={[{ value: '', label: '-- Chọn loại sự kiện --' }, ...EVENT_TYPE_OPTIONS]}
              />
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
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Số lượng (MT) *"
                  type="number"
                  step="0.01"
                  value={draft.billingQtyMt}
                  onChange={(e) => set('billingQtyMt', e.target.value)}
                  placeholder="0.00"
                />
                <Input
                  label="Ngày sự kiện *"
                  type="date"
                  value={draft.eventDate}
                  onChange={(e) => set('eventDate', e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-moon-200 bg-moon-50/80 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-navy-400">
                  {isValid
                    ? <span className="text-success font-medium">✓ Sẵn sàng ghi nhận</span>
                    : 'Điền đầy đủ loại sự kiện, chủ sở hữu, kho, số lượng và ngày'}
                </p>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={onClose}>Hủy</Button>
                  <Button variant="accent" onClick={handleSubmit} disabled={!isValid || isLoading}>
                    {isLoading ? 'Đang tạo...' : 'Tạo sự kiện'}
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
