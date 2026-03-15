import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, Sparkles, FileText, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePurchaseOrders, useCreateInboundReceipt } from '@domains/inbound-operations'
import { useLookupWarehouses, useLookupItems, useLookupUoms } from '@domains/master-data'
import { Badge, Button, Input, Select, Textarea } from '@shared/ui'

const emptyReceiptLine = { itemId: '', expectedQty: '', receivedQty: 0, uomId: '', status: 'NEW', notes: '' }

export function InboundReceiptsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [selectedPo, setSelectedPo] = useState(null)
  const [receiptDraft, setReceiptDraft] = useState({
    vehicleNumber: '',
    warehouseId: '',
    notes: '',
    lines: [{ ...emptyReceiptLine }],
  })

  const { data: poResponse } = usePurchaseOrders({ status: 'CONFIRMED', pageSize: 100 })
  const confirmedPos = poResponse?.data || []

  const createReceipt = useCreateInboundReceipt()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: items = [] } = useLookupItems()
  const { data: uoms = [] } = useLookupUoms()

  const itemOptions = [{ value: '', label: '-- Chọn mặt hàng --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]
  const uomOptions = uoms.map((u) => ({ value: u.id, label: u.code }))

  const handleOpenCreate = () => {
    setSelectedPo(null)
    setReceiptDraft({ vehicleNumber: '', warehouseId: '', notes: '', lines: [{ ...emptyReceiptLine }] })
    setShowCreate(true)
  }

  const handleSelectPo = (poId) => {
    const po = confirmedPos.find((p) => p.id === poId)
    setSelectedPo(po || null)
  }

  const updateReceiptLine = useCallback((idx, field, value) => {
    setReceiptDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    }))
  }, [])

  const addReceiptLine = useCallback(() => {
    setReceiptDraft((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyReceiptLine }] }))
  }, [])

  const removeReceiptLine = useCallback((idx) => {
    setReceiptDraft((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }))
  }, [])

  const handleCreateReceipt = async () => {
    if (!selectedPo) return
    const payload = {
      poId: selectedPo.id,
      ownerId: selectedPo.ownerId,
      vendorId: selectedPo.vendorId,
      warehouseId: receiptDraft.warehouseId,
      vehicleNumber: receiptDraft.vehicleNumber,
      blNumber: selectedPo.blNumber || '',
      notes: receiptDraft.notes || '',
      sourceApp: 'WEB',
      lines: receiptDraft.lines.filter((l) => l.itemId).map((l) => ({
        itemId: l.itemId,
        expectedQty: Number(l.expectedQty || 0),
        uomId: l.uomId || '',
        notes: l.notes || '',
      })),
    }
    await createReceipt.mutateAsync(payload)
    setShowCreate(false)
    setSelectedPo(null)
  }

  const handleClose = () => {
    setShowCreate(false)
    setSelectedPo(null)
  }

  const canSubmit = !createReceipt.isPending && selectedPo && receiptDraft.vehicleNumber && receiptDraft.warehouseId && receiptDraft.lines.some((l) => l.itemId)

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Phiếu nhập</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={handleOpenCreate}>+ Tạo phiếu nhập</Button>
          <Button variant="outline" size="sm">Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
        <p>Phiếu nhập đang được định nghĩa lại.</p>
      </div>

      {/* ── Create Receipt Drawer ── */}
      {createPortal(
        <AnimatePresence>
          {showCreate && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(7,13,23,0.6)' }}
                onClick={handleClose}
              />

              {/* Drawer panel */}
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col shadow-2xl"
                style={{ backgroundColor: 'var(--color-bg-card)', borderLeft: '1px solid var(--color-border)' }}
              >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-ice-light shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Tạo phiếu nhập kho</h2>
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Nhập thông tin để tạo phiếu nhập trong hệ thống</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text)' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto" style={{ borderBottom: '1px solid var(--color-border)' }}>

                  {/* Section 1: Thông tin chung */}
                  <div className="px-6 py-5 space-y-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white shrink-0">1</span>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Thông tin chung</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        label="Số PO *"
                        value={selectedPo?.id || ''}
                        onChange={(e) => handleSelectPo(e.target.value)}
                        options={[
                          { value: '', label: '-- Chọn PO đã xác nhận --' },
                          ...confirmedPos.map((po) => ({ value: po.id, label: po.poNumber }))
                        ]}
                      />
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Loại phiếu</label>
                        <div className="wrs-input flex items-center" style={{ height: '40px' }}>
                          {selectedPo ? (
                            <Badge variant={selectedPo.poType === 'SEA' ? 'info' : 'warning'}>
                              {selectedPo.poType === 'SEA' ? 'Đường biển' : 'Đường bộ'}
                            </Badge>
                          ) : (
                            <span className="italic text-sm" style={{ color: 'var(--color-text-muted)' }}>Chọn PO để xem</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Chủ hàng</label>
                        <div className="wrs-input flex items-center text-sm" style={{ height: '40px', color: selectedPo ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                          {selectedPo
                            ? `${selectedPo.owner?.ownerCode || ''} - ${selectedPo.owner?.ownerName || ''}`
                            : <span className="italic">Chọn PO để xem</span>}
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Số B/L</label>
                        <div className="wrs-input flex items-center font-mono text-sm" style={{ height: '40px', color: selectedPo ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                          {selectedPo?.blNumber || <span className="italic not-italic">N/A</span>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Biển số xe *"
                        value={receiptDraft.vehicleNumber}
                        onChange={(e) => setReceiptDraft((p) => ({ ...p, vehicleNumber: e.target.value }))}
                        placeholder="VD: 51D-12345"
                      />
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Số phiếu nhập</label>
                        <div className="wrs-input flex items-center gap-2" style={{ height: '40px' }}>
                          <Sparkles className="h-4 w-4 text-ice shrink-0" />
                          <span className="font-mono text-sm italic" style={{ color: 'var(--color-text-muted)' }}>Tự động tạo khi lưu</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        label="Kho *"
                        value={receiptDraft.warehouseId}
                        onChange={(e) => setReceiptDraft((p) => ({ ...p, warehouseId: e.target.value }))}
                        options={[{ value: '', label: '-- Chọn kho --' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.code} - ${w.name}` }))]}
                      />
                      <Textarea
                        label="Ghi chú"
                        rows={1}
                        value={receiptDraft.notes}
                        onChange={(e) => setReceiptDraft((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Nhập ghi chú..."
                      />
                    </div>
                  </div>

                  {/* Section 2: Chi tiết phiếu */}
                  <div className="px-6 py-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white shrink-0">2</span>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Chi tiết phiếu</h3>
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}>
                          {receiptDraft.lines.length} dòng
                        </span>
                      </div>
                      <Button variant="outline" size="sm" onClick={addReceiptLine}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Thêm dòng
                      </Button>
                    </div>

                    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
                      <table className="w-full min-w-[640px] text-sm">
                        <thead>
                          <tr className="text-left text-[11px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: 'var(--color-bg-subtle)', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                            <th className="px-3 py-2.5 w-10 text-center">STT</th>
                            <th className="px-3 py-2.5 min-w-[160px]">Mặt hàng *</th>
                            <th className="px-3 py-2.5 w-36 min-w-[144px] text-center">SL dự kiến *</th>
                            <th className="px-3 py-2.5 w-16 text-center">SL nhận</th>
                            <th className="px-3 py-2.5 w-20">ĐVT</th>
                            <th className="px-3 py-2.5 w-16 text-center">T.Thái</th>
                            <th className="px-3 py-2.5 min-w-[110px]">Ghi chú</th>
                            <th className="px-3 py-2.5 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {receiptDraft.lines.map((line, idx) => (
                            <tr key={idx}
                              style={{ borderBottom: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-card)' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-card)'}
                            >
                              <td className="px-3 py-2 text-center text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{idx + 1}</td>
                              <td className="px-3 py-2">
                                <Select value={line.itemId} onChange={(e) => updateReceiptLine(idx, 'itemId', e.target.value)} options={itemOptions} />
                              </td>
                              <td className="px-3 py-2 min-w-[144px]">
                                <Input type="number" value={line.expectedQty ?? ''} onChange={(e) => updateReceiptLine(idx, 'expectedQty', e.target.value === '' ? '' : Number(e.target.value))} min={0} />
                              </td>
                              <td className="px-3 py-2 text-center text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>0</td>
                              <td className="px-3 py-2">
                                <Select value={line.uomId} onChange={(e) => updateReceiptLine(idx, 'uomId', e.target.value)} options={[{ value: '', label: '--' }, ...uomOptions]} />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Badge variant="info" className="text-xs">Mới</Badge>
                              </td>
                              <td className="px-3 py-2">
                                <Input value={line.notes} onChange={(e) => updateReceiptLine(idx, 'notes', e.target.value)} placeholder="Ghi chú..." />
                              </td>
                              <td className="px-3 py-2 text-center">
                                {receiptDraft.lines.length > 1 && (
                                  <button
                                    onClick={() => removeReceiptLine(idx)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                                    style={{ color: 'var(--color-text-muted)' }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444' }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)' }}>
                  <Button variant="outline" onClick={handleClose}>Hủy</Button>
                  <Button variant="accent" onClick={handleCreateReceipt} disabled={!canSubmit}>
                    {createReceipt.isPending ? 'Đang tạo...' : 'Tạo phiếu nhập'}
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
