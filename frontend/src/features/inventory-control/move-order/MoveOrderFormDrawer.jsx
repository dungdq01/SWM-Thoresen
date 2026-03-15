import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MoveRight, X, Plus, Trash2 } from 'lucide-react'
import { Button, Input, Select } from '@shared/ui'

const REASON_CODES = [
  { value: 'CONSOLIDATE', label: 'Gộp hàng' },
  { value: 'REPLENISH', label: 'Bổ sung' },
  { value: 'REORGANIZE', label: 'Sắp xếp lại' },
]

const emptyLine = { itemId: '', ownerId: '', fromLocationId: '', toLocationId: '', requestedQty: '' }

const emptyDraft = {
  warehouseId: '',
  executionMode: 'DIRECT',
  reasonCode: '',
  lines: [{ ...emptyLine }],
}

export function MoveOrderFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  warehouses = [],
  items = [],
  owners = [],
  locations = [],
}) {
  const [draft, setDraft] = useState({ ...emptyDraft, lines: [{ ...emptyLine }] })

  useEffect(() => {
    if (isOpen) setDraft({ ...emptyDraft, lines: [{ ...emptyLine }] })
  }, [isOpen])

  const set = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }))

  const updateLine = useCallback((idx, field, value) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    }))
  }, [])

  const addLine = () => setDraft((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }))
  const removeLine = (idx) => setDraft((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }))

  const isValid = !!(draft.warehouseId && draft.lines.some((l) => l.itemId && l.fromLocationId && l.toLocationId && Number(l.requestedQty) > 0 && l.fromLocationId !== l.toLocationId))
  const validLines = draft.lines.filter((l) => l.itemId && Number(l.requestedQty) > 0)

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({ ...draft, lines: draft.lines.filter((l) => l.itemId) })
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
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800">
                  <MoveRight className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-navy-900">Tạo lệnh di chuyển</h2>
                  <p className="text-xs text-navy-400">Di chuyển hàng giữa các vị trí trong kho</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-moon-100 hover:text-navy-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Section 1 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">1</span>
                  <h3 className="text-sm font-semibold text-navy-900">Thông tin chung</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Kho *"
                    value={draft.warehouseId}
                    onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value, lines: prev.lines.map((l) => ({ ...l, fromLocationId: '', toLocationId: '' })) }))}
                    options={[{ value: '', label: '-- Chọn kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]}
                  />
                  <Select
                    label="Lý do"
                    value={draft.reasonCode}
                    onChange={(e) => set('reasonCode', e.target.value)}
                    options={[{ value: '', label: '-- Chọn lý do --' }, ...REASON_CODES]}
                  />
                </div>
              </div>

              {/* Section 2 — Dòng hàng */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">2</span>
                    <h3 className="text-sm font-semibold text-navy-900">Danh sách dòng hàng</h3>
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
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="Hàng hóa *"
                        value={line.itemId}
                        onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                        options={[{ value: '', label: '-- Chọn hàng hóa --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]}
                      />
                      <Select
                        label="Chủ hàng"
                        value={line.ownerId}
                        onChange={(e) => updateLine(idx, 'ownerId', e.target.value)}
                        options={[{ value: '', label: '-- Chọn chủ hàng --' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
                      />
                      <Select
                        label="Vị trí nguồn *"
                        value={line.fromLocationId}
                        onChange={(e) => updateLine(idx, 'fromLocationId', e.target.value)}
                        options={[{ value: '', label: '-- Chọn vị trí --' }, ...locations.map((l) => ({ value: l.id, label: l.code }))]}
                        disabled={!draft.warehouseId}
                      />
                      <Select
                        label="Vị trí đích *"
                        value={line.toLocationId}
                        onChange={(e) => updateLine(idx, 'toLocationId', e.target.value)}
                        options={[{ value: '', label: '-- Chọn vị trí --' }, ...locations.filter((l) => l.id !== line.fromLocationId).map((l) => ({ value: l.id, label: l.code }))]}
                        disabled={!draft.warehouseId}
                      />
                      <div className="col-span-2">
                        <Input
                          label="Số lượng (kg) *"
                          type="number"
                          value={line.requestedQty}
                          onChange={(e) => updateLine(idx, 'requestedQty', e.target.value)}
                          placeholder="0"
                        />
                      </div>
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
                    : 'Chọn kho, vị trí nguồn/đích và số lượng'}
                </p>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={onClose}>Hủy</Button>
                  <Button variant="accent" onClick={handleSubmit} disabled={!isValid || isLoading}>
                    {isLoading ? 'Đang xử lý...' : 'Tạo lệnh'}
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
