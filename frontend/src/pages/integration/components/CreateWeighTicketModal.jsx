import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Scale, X, Sparkles } from 'lucide-react'
import { Button, Input, Select, Textarea } from '@shared/ui'

const WEIGHING_TYPES = [
  { value: 'WEIGH_IN', label: 'Cân vào' },
  { value: 'WEIGH_OUT', label: 'Cân ra' },
]

export function CreateWeighTicketModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  warehouses = [],
  owners = [],
  items = [],
  receipts = [],
  shipments = [],
}) {
  const [draft, setDraft] = useState({
    warehouseId: '',
    vehicleNumber: '',
    weighingType: 'WEIGH_IN',
    ownerId: '',
    ticketNumber: '',
    notes: '',
  })

  // Reset form khi mở modal hoặc đổi loại cân
  useEffect(() => {
    if (isOpen) {
      setDraft({
        warehouseId: '',
        vehicleNumber: '',
        weighingType: 'WEIGH_IN',
        ownerId: '',
        ticketNumber: '',
        notes: '',
      })
    }
  }, [isOpen])

  // Reset ticketNumber khi đổi loại cân
  const handleWeighingTypeChange = (weighingType) => {
    setDraft({
      warehouseId: '',
      vehicleNumber: '',
      weighingType,
      ownerId: '',
      ticketNumber: '',
      notes: '',
    })
  }

  // Helper: lấy mã hiển thị của receipt (asnId > id slice)
  const getReceiptDisplayCode = (r) => r.asnId || r.id?.slice(0, 8)

  // Helper: tìm receipt theo mã hiển thị
  const findReceiptByCode = (code) =>
    receipts.find((r) => getReceiptDisplayCode(r) === code)

  // Lấy ticket hiện tại (receipt hoặc shipment)
  const currentTicket = useMemo(() => {
    if (!draft.ticketNumber) return null
    if (draft.weighingType === 'WEIGH_IN') {
      return findReceiptByCode(draft.ticketNumber)
    } else {
      return shipments.find((s) => s.shipmentNumber === draft.ticketNumber)
    }
  }, [draft.ticketNumber, draft.weighingType, receipts, shipments])

  // Auto-fill khi chọn mã phiếu
  const handleTicketChange = (ticketId) => {
    if (!ticketId) {
      setDraft((prev) => ({
        ...prev,
        ticketNumber: '',
        warehouseId: '',
        vehicleNumber: '',
        ownerId: '',
      }))
      return
    }

    // Tìm receipt hoặc shipment theo loại cân
    const ticket = draft.weighingType === 'WEIGH_IN'
      ? findReceiptByCode(ticketId)
      : shipments.find((s) => s.shipmentNumber === ticketId)

    if (ticket) {
      setDraft((prev) => ({
        ...prev,
        ticketNumber: ticketId,
        warehouseId: ticket.warehouseId || ticket.warehouse?.id || '',
        vehicleNumber: ticket.vehicleNumber || '',
        ownerId: ticket.ownerId || ticket.owner?.id || '',
      }))
    }
  }

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleSubmit = () => {
    const payload = {
      weighbridgeEventId: `WB-EVT-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      vehicleNumber: draft.vehicleNumber,
      weighingType: draft.weighingType,
      weighingSequence: 1,
      isManualEntry: true,
      manualReasonCode: 'MANUAL_CREATE',
      correlationId: crypto.randomUUID(),
      sourceChannel: 'WEB_MANUAL',
      eventTime: new Date().toISOString(),
      // Reference to receipt/shipment
      referenceType: draft.weighingType === 'WEIGH_IN' ? 'RECEIPT' : 'SHIPMENT',
      referenceId: currentTicket?.id || null,
      // Additional fields for manual entry
      warehouseId: draft.warehouseId || null,
      ownerId: draft.ownerId || null,
      notes: draft.notes || null,
    }
    onSubmit(payload)
  }

  const isValid = !!(
    draft.vehicleNumber &&
    draft.weighingType
  )

  // Filter options dựa trên ticket đã chọn
  const ticketWarehouseId = currentTicket?.warehouseId || currentTicket?.warehouse?.id
  const ticketOwnerId = currentTicket?.ownerId || currentTicket?.owner?.id

  const warehouseOptions = useMemo(() => {
    if (ticketWarehouseId) {
      const w = warehouses.find((w) => w.id === ticketWarehouseId)
      return w ? [{ value: w.id, label: `${w.code} - ${w.name}` }] : [{ value: '', label: '-- Chọn kho --' }]
    }
    return [
      { value: '', label: '-- Chọn kho --' },
      ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` })),
    ]
  }, [warehouses, ticketWarehouseId])

  const ownerOptions = useMemo(() => {
    if (ticketOwnerId) {
      const o = owners.find((o) => o.id === ticketOwnerId)
      return o ? [{ value: o.id, label: `${o.code} - ${o.name}` }] : [{ value: '', label: '-- Chọn chủ hàng --' }]
    }
    return [
      { value: '', label: '-- Chọn chủ hàng --' },
      ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` })),
    ]
  }, [owners, ticketOwnerId])

  // Danh sách items từ ASN/shipment
  const ticketLines = useMemo(() => {
    if (!currentTicket?.lines?.length) return []
    return currentTicket.lines.map((l, idx) => ({
      lineNumber: idx + 1,
      itemCode: l.item?.itemCode || l.itemCode || '—',
      itemName: l.item?.itemName || l.itemName || '',
      expectedQty: l.expectedQty || 0,
      uomCode: l.uom?.uomCode || l.uomCode || '',
      status: l.status || 'OPEN',
    }))
  }, [currentTicket])

  // Tạo options cho mã phiếu dựa theo loại cân
  const ticketOptions = useMemo(() => {
    if (draft.weighingType === 'WEIGH_IN') {
      return [
        { value: '', label: '-- Chọn mã phiếu nhập --' },
        ...receipts
          .filter((r) => r.asnId || r.id)
          .map((r) => {
            const code = getReceiptDisplayCode(r)
            return { value: code, label: code }
          }),
      ]
    } else {
      return [
        { value: '', label: '-- Chọn mã phiếu xuất --' },
        ...shipments.filter((s) => s.shipmentNumber).map((s) => ({ value: s.shipmentNumber, label: s.shipmentNumber })),
      ]
    }
  }, [draft.weighingType, receipts, shipments])

  // Label động cho mã phiếu
  const ticketLabel = draft.weighingType === 'WEIGH_IN' ? 'Mã phiếu nhập' : 'Mã phiếu xuất'

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
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[100vw] sm:max-w-xl flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-ice-light">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    Tạo phiếu cân
                  </h2>
                  <p className="text-sm text-navy-400">
                    Nhập thông tin phiếu cân thủ công
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
                  {/* Mã phiếu cân - Auto gen */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                      Mã phiếu cân <span className="font-normal text-navy-400">(Tự động)</span>
                    </label>
                    <div className="flex h-10 items-center gap-2 rounded-xl border-2 border-moon-200 bg-moon-50 px-4">
                      <Sparkles className="h-4 w-4 shrink-0 text-ice" />
                      <span className="font-mono text-sm font-semibold text-navy-700">
                        WB-EVT-...
                      </span>
                    </div>
                  </div>

                  {/* Loại cân */}
                  <Select
                    label="Loại cân *"
                    value={draft.weighingType}
                    onChange={(e) => handleWeighingTypeChange(e.target.value)}
                    options={WEIGHING_TYPES}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Mã phiếu nhập/xuất */}
                  <Select
                    label={ticketLabel}
                    value={draft.ticketNumber}
                    onChange={(e) => handleTicketChange(e.target.value)}
                    options={ticketOptions}
                  />

                  {/* Kho */}
                  <Select
                    label="Kho"
                    value={draft.warehouseId}
                    onChange={(e) => setDraft((prev) => ({ ...prev, warehouseId: e.target.value }))}
                    options={warehouseOptions}
                    disabled={!!ticketWarehouseId}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Biển số xe */}
                  <Input
                    label="Số xe *"
                    value={draft.vehicleNumber}
                    onChange={(e) => setDraft((prev) => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                    placeholder="VD: 51C-12345"
                    disabled={!!currentTicket?.vehicleNumber}
                  />

                  {/* Chủ hàng */}
                  <Select
                    label="Chủ hàng"
                    value={draft.ownerId}
                    onChange={(e) => setDraft((prev) => ({ ...prev, ownerId: e.target.value }))}
                    options={ownerOptions}
                    disabled={!!ticketOwnerId}
                  />
                </div>

                {/* Danh sách mặt hàng từ phiếu */}
                {ticketLines.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                      Mặt hàng trên phiếu ({ticketLines.length} dòng)
                    </label>
                    <div className="rounded-xl border border-moon-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-moon-50 text-navy-600">
                            <th className="px-3 py-2 text-left font-medium">#</th>
                            <th className="px-3 py-2 text-left font-medium">Mặt hàng</th>
                            <th className="px-3 py-2 text-right font-medium">SL dự kiến</th>
                            <th className="px-3 py-2 text-center font-medium">ĐVT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-moon-100">
                          {ticketLines.map((line) => (
                            <tr key={line.lineNumber} className="text-navy-800">
                              <td className="px-3 py-2 text-navy-400">{line.lineNumber}</td>
                              <td className="px-3 py-2">
                                <p className="font-medium">{line.itemName}</p>
                                <p className="text-xs text-navy-400">{line.itemCode}</p>
                              </td>
                              <td className="px-3 py-2 text-right font-mono">{Number(line.expectedQty).toLocaleString('vi-VN')}</td>
                              <td className="px-3 py-2 text-center">{line.uomCode}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-1.5 text-xs text-navy-400">
                      Phiếu cân sẽ áp dụng cho tất cả {ticketLines.length} mặt hàng. Phân bổ khối lượng theo quy trình dỡ hàng (N+1 lần cân).
                    </p>
                  </div>
                )}
              </div>

              {/* Section 2: Ghi chú */}
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">2</span>
                  <h3 className="text-sm font-semibold text-navy-800">Ghi chú</h3>
                </div>

                <Textarea
                  rows={3}
                  value={draft.notes}
                  onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Nhập ghi chú (tuỳ chọn)..."
                />
              </div>

            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-navy-400">
                  {isValid ? (
                    <span className="font-medium text-emerald-600">
                      ✓ Sẵn sàng tạo phiếu cân
                    </span>
                  ) : (
                    '* Số xe là bắt buộc'
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
                    Tạo phiếu cân
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
