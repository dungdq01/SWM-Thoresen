import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Package, X } from 'lucide-react'
import { Button, Input, Select } from '@shared/ui'

const VAS_TYPES = [
  { value: 'BAGGING', label: 'Đóng bao' },
  { value: 'REPACKING', label: 'Đóng gói lại' },
]

const emptyDraft = {
  vasType: 'BAGGING',
  warehouseId: '',
  ownerId: '',
  sourceItemId: '',
  sourceQty: '',
  targetQty: '',
  bagWeightKg: '50',
}

export function VasWorkOrderFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  warehouses = [],
  owners = [],
  items = [],
}) {
  const [draft, setDraft] = useState({ ...emptyDraft })

  useEffect(() => {
    if (isOpen) setDraft({ ...emptyDraft })
  }, [isOpen])

  const set = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }))

  const isValid = !!(draft.warehouseId && draft.ownerId && draft.sourceItemId && Number(draft.sourceQty) > 0 && Number(draft.targetQty) > 0 && Number(draft.bagWeightKg) > 0)

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      ...draft,
      sourceQty: Number(draft.sourceQty),
      targetQty: Number(draft.targetQty),
      bagWeightKg: Number(draft.bagWeightKg),
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
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-navy-900">Tạo đơn hàng VAS</h2>
                  <p className="text-xs text-navy-400">Đóng bao / đóng gói lại</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-moon-100 hover:text-navy-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <Select
                label="Loại VAS"
                value={draft.vasType}
                onChange={(e) => set('vasType', e.target.value)}
                options={VAS_TYPES}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Kho *"
                  value={draft.warehouseId}
                  onChange={(e) => set('warehouseId', e.target.value)}
                  options={[{ value: '', label: '-- Chọn kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]}
                />
                <Select
                  label="Chủ hàng *"
                  value={draft.ownerId}
                  onChange={(e) => set('ownerId', e.target.value)}
                  options={[{ value: '', label: '-- Chọn chủ hàng --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
                />
              </div>
              <Select
                label="Mặt hàng nguồn *"
                value={draft.sourceItemId}
                onChange={(e) => set('sourceItemId', e.target.value)}
                options={[{ value: '', label: '-- Chọn mặt hàng --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]}
              />

              <div className="rounded-xl border border-moon-200 bg-moon-50/60 p-4 space-y-4">
                <p className="text-sm font-semibold text-navy-800">Thông số đóng gói</p>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Khối lượng nguồn (kg) *"
                    type="number"
                    value={draft.sourceQty}
                    onChange={(e) => set('sourceQty', e.target.value)}
                    placeholder="0"
                  />
                  <Input
                    label="Số lượng bao (bao) *"
                    type="number"
                    value={draft.targetQty}
                    onChange={(e) => set('targetQty', e.target.value)}
                    placeholder="0"
                  />
                  <Input
                    label="Trọng lượng/bao (kg) *"
                    type="number"
                    value={draft.bagWeightKg}
                    onChange={(e) => set('bagWeightKg', e.target.value)}
                    placeholder="50"
                  />
                </div>
                {draft.sourceQty && draft.targetQty && draft.bagWeightKg && (
                  <p className="text-xs text-navy-500">
                    Tổng dự kiến: <strong>{(Number(draft.targetQty) * Number(draft.bagWeightKg)).toLocaleString()} kg</strong>
                    {Number(draft.sourceQty) > 0 && ` / Nguồn: ${Number(draft.sourceQty).toLocaleString()} kg`}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-moon-200 bg-moon-50/80 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-navy-400">
                  {isValid
                    ? <span className="text-success font-medium">✓ Thông tin đầy đủ</span>
                    : 'Điền đầy đủ kho, chủ hàng, mặt hàng và thông số đóng gói'}
                </p>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={onClose}>Hủy</Button>
                  <Button variant="accent" onClick={handleSubmit} disabled={!isValid || isLoading}>
                    {isLoading ? 'Đang xử lý...' : 'Tạo đơn hàng'}
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
