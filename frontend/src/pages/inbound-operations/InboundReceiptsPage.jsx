import { useState, useCallback } from 'react'
import { FileText, Plus, Trash2, Sparkles } from 'lucide-react'
import { usePurchaseOrders, useCreateInboundReceipt } from '@domains/inbound-operations'
import { useLookupWarehouses, useLookupItems, useLookupUoms } from '@domains/master-data'
import { Badge, Button, Input, Modal, Select, Textarea } from '@shared/ui'

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

  // Fetch confirmed POs for dropdown
  const { data: poResponse } = usePurchaseOrders({ status: 'CONFIRMED', pageSize: 100 })
  const confirmedPos = poResponse?.data || []

  const createReceipt = useCreateInboundReceipt()
  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: items = [] } = useLookupItems()
  const { data: uoms = [] } = useLookupUoms()

  const itemOptions = [{ value: '', label: '-- Chọn mặt hàng --' }, ...items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))]
  const uomOptions = uoms.map((u) => ({ value: u.id, label: u.code }))

  // ── Handlers ──
  const handleOpenCreate = () => {
    setSelectedPo(null)
    setReceiptDraft({
      vehicleNumber: '',
      warehouseId: '',
      notes: '',
      lines: [{ ...emptyReceiptLine }],
    })
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

  const handleCloseModal = () => {
    setShowCreate(false)
    setSelectedPo(null)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Phiếu nhập</h2>
        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" onClick={handleOpenCreate}>Tạo phiếu nhập</Button>
          <Button variant="outline" size="sm">Làm mới</Button>
        </div>
      </div>

      <div className="wrs-card p-8 text-center text-navy-400">
        <p>Phiếu nhập đang được định nghĩa lại.</p>
      </div>

      {/* ── Create Receipt Modal ── */}
      <Modal
        isOpen={showCreate}
        onClose={handleCloseModal}
        title="Tạo phiếu nhập kho"
        size="xl"
      >
        <div className="space-y-5">
          {/* Section 1: Thông tin chung */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-navy-800 border-b border-moon-200 pb-2">1. Thông tin chung</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Số PO *</label>
                <Select
                  value={selectedPo?.id || ''}
                  onChange={(e) => handleSelectPo(e.target.value)}
                  options={[
                    { value: '', label: '-- Chọn PO đã xác nhận --' },
                    ...confirmedPos.map((po) => ({ value: po.id, label: po.poNumber }))
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Loại phiếu</label>
                <div className="rounded-lg border border-navy-200 bg-navy-50 px-3 py-2.5">
                  {selectedPo ? (
                    <Badge variant={selectedPo.poType === 'SEA' ? 'info' : 'warning'}>
                      {selectedPo.poType === 'SEA' ? 'Đường biển' : 'Đường bộ'}
                    </Badge>
                  ) : (
                    <span className="text-navy-400 italic">Chọn PO để xem</span>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Chủ hàng</label>
                <div className="rounded-lg border border-navy-200 bg-navy-50 px-3 py-2.5 text-navy-800">
                  {selectedPo ? `${selectedPo.owner?.ownerCode || ''} - ${selectedPo.owner?.ownerName || ''}` : <span className="text-navy-400 italic">Chọn PO để xem</span>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Số B/L</label>
                <div className="rounded-lg border border-navy-200 bg-navy-50 px-3 py-2.5 text-navy-800 font-mono">
                  {selectedPo?.blNumber || <span className="text-navy-400 italic">N/A</span>}
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
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Số phiếu nhập</label>
                <div className="flex items-center gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2.5">
                  <Sparkles className="h-4 w-4 text-ice shrink-0" />
                  <span className="font-mono text-navy-500 italic">Tự động tạo khi lưu</span>
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-navy-800 border-b border-moon-200 pb-2">2. Chi tiết phiếu</h3>
              <Button variant="outline" size="sm" onClick={addReceiptLine}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Thêm dòng
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-moon-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-moon-50 text-left text-xs font-semibold text-navy-600 uppercase tracking-wide">
                    <th className="px-3 py-2.5 w-12 text-center">STT</th>
                    <th className="px-3 py-2.5 min-w-[180px]">Mã hàng hóa *</th>
                    <th className="px-3 py-2.5 w-28 text-center">SL dự kiến *</th>
                    <th className="px-3 py-2.5 w-24 text-center">SL đã nhận</th>
                    <th className="px-3 py-2.5 w-24 text-center">ĐVT</th>
                    <th className="px-3 py-2.5 w-20 text-center">Trạng thái</th>
                    <th className="px-3 py-2.5 min-w-[120px]">Ghi chú</th>
                    <th className="px-3 py-2.5 w-12">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-moon-100">
                  {receiptDraft.lines.map((line, idx) => (
                    <tr key={idx} className="bg-white hover:bg-moon-50/50">
                      <td className="px-3 py-2 text-center text-navy-500 font-medium">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <Select
                          value={line.itemId}
                          onChange={(e) => updateReceiptLine(idx, 'itemId', e.target.value)}
                          options={itemOptions}
                          className="min-w-[160px]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={line.expectedQty}
                          onChange={(e) => updateReceiptLine(idx, 'expectedQty', e.target.value)}
                          className="text-center"
                          min={0}
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-navy-400">0</td>
                      <td className="px-3 py-2">
                        <Select
                          value={line.uomId}
                          onChange={(e) => updateReceiptLine(idx, 'uomId', e.target.value)}
                          options={[{ value: '', label: '--' }, ...uomOptions]}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="info" className="text-xs">Mới</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={line.notes}
                          onChange={(e) => updateReceiptLine(idx, 'notes', e.target.value)}
                          placeholder="Ghi chú..."
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        {receiptDraft.lines.length > 1 && (
                          <button onClick={() => removeReceiptLine(idx)} className="text-red-400 hover:text-red-600 p-1">
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

          <div className="flex justify-end gap-3 pt-4 border-t border-moon-200">
            <Button variant="outline" onClick={handleCloseModal}>Hủy</Button>
            <Button
              variant="accent"
              onClick={handleCreateReceipt}
              disabled={createReceipt.isPending || !selectedPo || !receiptDraft.vehicleNumber || !receiptDraft.warehouseId || receiptDraft.lines.every((l) => !l.itemId)}
            >
              {createReceipt.isPending ? 'Đang tạo...' : 'Tạo phiếu nhập'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
