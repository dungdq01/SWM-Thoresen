import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCcw, X } from 'lucide-react'
import { Button, Select } from '@shared/ui'

const SCOPE_TYPES = [
  { value: 'FULL', label: 'Toàn bộ hệ thống' },
  { value: 'WAREHOUSE', label: 'Theo kho' },
]

const emptyDraft = {
  scopeType: 'FULL',
  warehouseId: '',
}

export function ReconciliationFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  warehouses = [],
}) {
  const [draft, setDraft] = useState({ ...emptyDraft })

  useEffect(() => {
    if (isOpen) setDraft({ ...emptyDraft })
  }, [isOpen])

  const set = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }))

  const isValid = draft.scopeType === 'FULL' || (draft.scopeType === 'WAREHOUSE' && !!draft.warehouseId)

  const handleSubmit = () => {
    if (!isValid) return
    const payload = { scopeType: draft.scopeType }
    if (draft.scopeType === 'WAREHOUSE') payload.warehouseId = draft.warehouseId
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
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[100vw] sm:max-w-md flex-col bg-white shadow-2xl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800">
                  <RefreshCcw className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-navy-900">Tạo phiên đối soát</h2>
                  <p className="text-xs text-navy-400">So khớp tồn kho giữa các hệ thống</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-moon-100 hover:text-navy-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <Select
                label="Phạm vi đối soát *"
                value={draft.scopeType}
                onChange={(e) => set('scopeType', e.target.value)}
                options={SCOPE_TYPES}
              />

              {draft.scopeType === 'WAREHOUSE' && (
                <Select
                  label="Kho *"
                  value={draft.warehouseId}
                  onChange={(e) => set('warehouseId', e.target.value)}
                  options={[{ value: '', label: '-- Chọn kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]}
                />
              )}

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-sm font-medium text-amber-800">Lưu ý</p>
                <p className="text-xs text-amber-700 mt-1">
                  Quá trình đối soát có thể mất vài phút tùy theo khối lượng dữ liệu.
                  Hệ thống sẽ tự động so khớp tồn kho và tạo báo cáo chênh lệch.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-moon-200 bg-moon-50/80 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-navy-400">
                  {isValid
                    ? <span className="text-success font-medium">✓ Sẵn sàng khởi chạy</span>
                    : 'Chọn kho để đối soát'}
                </p>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={onClose}>Hủy</Button>
                  <Button variant="accent" onClick={handleSubmit} disabled={!isValid || isLoading}>
                    {isLoading ? 'Đang khởi chạy...' : 'Khởi chạy đối soát'}
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
