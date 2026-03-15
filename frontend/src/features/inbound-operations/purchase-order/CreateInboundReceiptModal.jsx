import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2, FileText, Sparkles, X } from 'lucide-react'
import { Button, Input, Select, Textarea, Badge } from '@shared/ui'

const emptyLine = {
  itemId: '',
  expectedQty: 0,
  receivedQty: 0,
  uomId: '',
  status: 'NEW',
  notes: '',
}

export function CreateInboundReceiptModal({
  isOpen,
  onClose,
  onSubmit,
  purchaseOrder = null,
  confirmedPos = [],
  isLoading = false,
  nextReceiptNumber = '',
  warehouses = [],
  items = [],
  uoms = [],
}) {
  const [selectedPoId, setSelectedPoId] = useState('')
  const showPoSelector = !purchaseOrder && confirmedPos.length > 0
  const activePo = purchaseOrder || confirmedPos.find((p) => p.id === selectedPoId) || null
  const [draft, setDraft] = useState({
    warehouseId: '',
    vehiclePlate: '',
    notes: '',
    lines: [{ ...emptyLine }],
  })

  // Reset form khi mở modal hoặc PO thay đổi
  useEffect(() => {
    if (!isOpen) {
      setSelectedPoId('')
      return
    }
    if (!activePo) return

    // Khởi tạo lines từ PO lines
    const initialLines = (activePo.lines || []).map((line) => ({
      poLineId: line.id,
      itemId: line.itemId || '',
      expectedQty: line.expectedQty || 0,
      receivedQty: 0,
      uomId: line.uomId || '',
      status: 'NEW',
      notes: '',
    }))

    setDraft({
      warehouseId: activePo.warehouseId || '',
      vehiclePlate: '',
      notes: '',
      lines: initialLines.length > 0 ? initialLines : [{ ...emptyLine }],
    })
  }, [isOpen, activePo])

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
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx),
    }))
  }, [])

  const handleSubmit = () => {
    if (!activePo) return

    // Tính tổng expectedQty từ lines
    const validLines = draft.lines.filter((l) => l.itemId && l.expectedQty > 0)
    const totalExpectedQty = validLines.reduce((sum, l) => sum + Number(l.expectedQty || 0), 0)

    // Lấy cargoForm từ item đầu tiên trong PO lines
    const getCargoForm = (itemId) => {
      const poLine = activePo.lines?.find((l) => l.itemId === itemId)
      return poLine?.item?.cargoForm || 'BULK'
    }

    const generateAsnId = () => {
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      return `ASN-${dateStr}-${random}`
    }

    const payload = {
      poId: activePo.poNumber || activePo.id,
      asnId: generateAsnId(),
      ownerId: activePo.ownerId,
      vendorId: activePo.vendorId,
      warehouseId: draft.warehouseId,
      vehicleNumber: draft.vehiclePlate || '',
      blNumber: activePo.blNumber || '',
      expectedQty: totalExpectedQty,
      notes: draft.notes || '',
      sourceApp: 'WEB',
      lines: validLines.map((l) => ({
        itemId: l.itemId,
        uomId: l.uomId,
        expectedQty: Number(l.expectedQty || 0),
        cargoForm: getCargoForm(l.itemId),
        notes: l.notes || '',
      })),
    }
    onSubmit(payload)
  }

  const isValid = !!(
    activePo &&
    draft.warehouseId &&
    draft.vehiclePlate &&
    draft.lines.some((l) => l.itemId && l.uomId && l.expectedQty > 0)
  )

  // Filter items chỉ từ PO lines
  const poItemIds = (activePo?.lines || []).map((l) => l.itemId)
  const filteredItems = items.filter((i) => poItemIds.includes(i.id))
  
  const itemOptions = [
    { value: '', label: '-- Chọn mã hàng hóa --' },
    ...filteredItems.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` })),
  ]

  const uomOptions = [
    { value: '', label: '--' },
    ...uoms.map((u) => ({ value: u.id, label: u.code })),
  ]

  const warehouseOptions = [
    { value: '', label: '-- Chọn kho --' },
    ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` })),
  ]

  const poOptions = [
    { value: '', label: '-- Chọn PO đã xác nhận --' },
    ...confirmedPos.map((po) => ({
      value: po.id,
      label: `${po.poNumber} — ${po.owner?.ownerCode || ''} — ${po.totalExpectedQty?.toLocaleString() || 0} kg`
    }))
  ]

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
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
                    Tạo phiếu nhập kho
                  </h2>
                  <p className="text-sm text-navy-400">
                    {activePo ? `Tạo phiếu nhập từ PO ${activePo.poNumber}` : 'Chọn PO để tạo phiếu nhập'}
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
                  {/* Số PO - Dropdown hoặc Readonly */}
                  {showPoSelector ? (
                    <Select
                      label="Số PO *"
                      value={selectedPoId}
                      onChange={(e) => setSelectedPoId(e.target.value)}
                      options={poOptions}
                    />
                  ) : (
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                        Số PO
                      </label>
                      <div className="flex h-10 items-center rounded-xl border border-moon-200 bg-moon-50 px-4">
                        <FileText className="mr-2 h-4 w-4 text-navy-400" />
                        <span className="font-mono text-sm font-medium text-navy-700">
                          {activePo?.poNumber || '—'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Loại phiếu - Readonly */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                      Loại phiếu
                    </label>
                    <div className="flex h-10 items-center rounded-xl border border-moon-200 bg-moon-50 px-4">
                      {activePo ? (
                        <Badge variant={activePo.poType === 'SEA' ? 'info' : 'warning'}>
                          {activePo.poType === 'SEA' ? 'Đường biển' : 'Đường bộ'}
                        </Badge>
                      ) : (
                        <span className="text-sm text-navy-400 italic">Chọn PO</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Chủ hàng - Readonly */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                      Chủ hàng
                    </label>
                    <div className="flex h-10 items-center rounded-xl border border-moon-200 bg-moon-50 px-4">
                      {activePo ? (
                        <span className="text-sm text-navy-700">
                          {activePo.owner?.ownerCode || activePo.ownerId} -{' '}
                          {activePo.owner?.ownerName || ''}
                        </span>
                      ) : (
                        <span className="text-sm text-navy-400 italic">Chọn PO</span>
                      )}
                    </div>
                  </div>

                  {/* Số B/L - Readonly */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                      Số B/L
                    </label>
                    <div className="flex h-10 items-center rounded-xl border border-moon-200 bg-moon-50 px-4">
                      <span className="font-mono text-sm text-navy-700">
                        {activePo?.blNumber || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Số phiếu nhập - Auto gen */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                      Số phiếu nhập <span className="font-normal text-navy-400">(Tự động)</span>
                    </label>
                    <div className="flex h-10 items-center gap-2 rounded-xl border-2 border-moon-200 bg-moon-50 px-4">
                      <Sparkles className="h-4 w-4 shrink-0 text-ice" />
                      <span className="font-mono text-sm font-semibold text-navy-700">
                        {nextReceiptNumber || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Biển số xe */}
                  <Input
                    label="Biển số xe"
                    value={draft.vehiclePlate}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, vehiclePlate: e.target.value }))
                    }
                    placeholder="VD: 51C-12345"
                  />
                </div>

                <Select
                  label="Kho *"
                  value={draft.warehouseId}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))
                  }
                  options={warehouseOptions}
                />

                {/* Ghi chú */}
                <Textarea
                  label="Ghi chú"
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Nhập ghi chú..."
                />
              </div>

              {/* Section 2: Chi tiết phiếu */}
              <div className="px-6 py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">2</span>
                    <h3 className="text-sm font-semibold text-navy-800">Chi tiết phiếu</h3>
                    <span className="rounded-full bg-moon-100 px-2 py-0.5 text-xs font-medium text-navy-500">
                      {draft.lines.filter((l) => l.itemId && l.expectedQty > 0).length}/{draft.lines.length} dòng
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={addLine}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Thêm dòng
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
                          label="Mã hàng hóa *"
                          value={line.itemId}
                          onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                          options={itemOptions}
                        />
                        <Input
                          label="SL dự kiến *"
                          type="number"
                          min={0}
                          value={line.expectedQty}
                          onChange={(e) =>
                            updateLine(idx, 'expectedQty', Number(e.target.value))
                          }
                          className="text-center"
                        />
                        <Select
                          label="ĐVT"
                          value={line.uomId}
                          onChange={(e) => updateLine(idx, 'uomId', e.target.value)}
                          options={uomOptions}
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

                      <p className="mt-1.5 text-xs text-navy-400">
                        Đã nhận: <span className="font-semibold text-emerald-600">{line.receivedQty || 0}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-navy-400">
                  {isValid ? (
                    <span className="font-medium text-emerald-600">
                      ✓ {draft.lines.filter((l) => l.itemId && l.expectedQty > 0).length} dòng
                      hàng sẵn sàng
                    </span>
                  ) : (
                    '* Kho, biển số xe và ít nhất 1 dòng hàng hóa với ĐVT và số lượng > 0 là bắt buộc'
                  )}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} disabled={isLoading}>
                    Hủy
                  </Button>
                  <Button
                    variant="accent"
                    onClick={handleSubmit}
                    isLoading={isLoading}
                    disabled={!isValid}
                  >
                    Tạo phiếu nhập
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
