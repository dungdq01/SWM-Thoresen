import { useState } from 'react'
import { useApplyInboundManualWeight, useInboundReceiptHistory, useInboundReceipts, useInboundWeighLogs, useRecordInboundWeighIn, useRecordInboundWeighOut, useStartInboundProcessing } from '@domains/inbound-operations'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Textarea } from '@shared/ui'

const executionRows = ['AWAITING_WEIGHING', 'WEIGHED_IN', 'PROCESSING', 'WEIGHED_OUT', 'REJECTED']

const statusTone = (status) => {
  if (status === 'RECEIVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  if (['WEIGHED_IN', 'PROCESSING', 'WEIGHED_OUT'].includes(status)) return 'warning'
  return 'default'
}

export function InboundExecutionPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, status: '' })
  const [selectedId, setSelectedId] = useState(null)
  const [weighInForm, setWeighInForm] = useState({ grossWeightKg: '', ticketId: '', sourceApp: 'WEB', isManualEntry: false, reasonCode: '' })
  const [weighOutForm, setWeighOutForm] = useState({ tareWeightKg: '', ticketId: '', sourceApp: 'WEB', isManualEntry: false, reasonCode: '' })
  const [manualForm, setManualForm] = useState({ grossWeightKg: '', tareWeightKg: '', reasonCode: 'WB_FALLBACK', note: '' })

  const { data: response, isLoading, refetch } = useInboundReceipts({ ...filters, status: filters.status || undefined })
  const startProcessing = useStartInboundProcessing()
  const recordWeighIn = useRecordInboundWeighIn()
  const recordWeighOut = useRecordInboundWeighOut()
  const applyManualWeight = useApplyInboundManualWeight()

  const rows = (response?.data || []).filter((item) => executionRows.includes(item.status))
  const pagination = response?.pagination || { page: 1, totalPages: 1 }
  const selected = rows.find((item) => item.id === selectedId)

  const { data: historyResponse } = useInboundReceiptHistory(selected?.id)
  const { data: weighLogsResponse } = useInboundWeighLogs(selected?.id)

  const historyRows = historyResponse?.data || []
  const weighRows = weighLogsResponse?.data || []

  const openDetail = (id) => setSelectedId(id)
  const closeDetail = () => setSelectedId(null)

  const handleWeighIn = async () => {
    if (!selected?.id) return
    await recordWeighIn.mutateAsync({ receiptId: selected.id, ...weighInForm })
    refetch()
  }

  const handleWeighOut = async () => {
    if (!selected?.id) return
    await recordWeighOut.mutateAsync({ receiptId: selected.id, ...weighOutForm })
    refetch()
  }

  const handleManual = async () => {
    if (!selected?.id) return
    await applyManualWeight.mutateAsync({ id: selected.id, data: manualForm })
    refetch()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Thực hiện cân & dung sai</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'AWAITING_WEIGHING', label: 'Chờ cân' }, { value: 'WEIGHED_IN', label: 'Đã cân vào' }, { value: 'PROCESSING', label: 'Đang xử lý' }, { value: 'WEIGHED_OUT', label: 'Đã cân ra' }, { value: 'REJECTED', label: 'Từ chối' }]} placeholder="Trạng thái thực hiện" className="max-w-xs" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Phiếu nhập</TableHead>
              <TableHead>Xe</TableHead>
              <TableHead align="right">Tổng / Bì / Ròng</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={5} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="Không có phiếu trong hàng đợi thực hiện" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id} onClick={() => openDetail(row.id)}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.receiptNumber}</p>
                    <p className="text-xs text-navy-400">Lần {row.attemptNumber}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.vehicleNumber || row.blNumber || 'N/A'}</p>
                  <p className="text-xs text-navy-400">{row.item?.itemCode || row.itemId}</p>
                </TableCell>
                <TableCell align="right">
                  <div className="text-sm">
                    <p>G: {row.grossWeightKg || 0}</p>
                    <p>T: {row.tareWeightKg || 0}</p>
                    <p className="font-semibold text-navy-900">N: {row.netWeightKg || 0}</p>
                  </div>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  {row.status === 'WEIGHED_IN' ? <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); startProcessing.mutate(row.id) }}>Bắt đầu xử lý</Button> : <Button variant="ghost" size="sm" onClick={() => openDetail(row.id)}>Chi tiết</Button>}
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      <Modal
        isOpen={!!selected}
        onClose={closeDetail}
        title={`Phiếu: ${selected?.receiptNumber || ''}`}
        description="Chi tiết thực hiện cân và các thao tác"
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-xl border border-moon-300 bg-moon-50/70 p-4 text-sm text-navy-700 grid grid-cols-2 gap-2">
              <p><strong>Trạng thái:</strong> {selected.status}</p>
              <p><strong>Dự kiến:</strong> {selected.expectedQty} kg</p>
              <p><strong>Dung sai:</strong> {selected.tolerancePctApplied ?? '—'}%</p>
              <p><strong>Chênh lệch:</strong> {selected.variancePct ?? '—'}%</p>
            </div>

            {/* Cân vào - chỉ hiện khi AWAITING_WEIGHING */}
            {selected.status === 'AWAITING_WEIGHING' && (
              <div className="border-t border-moon-200 pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-navy-900">Cân vào</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Trọng lượng tổng (kg)" type="number" value={weighInForm.grossWeightKg} onChange={(e) => setWeighInForm((prev) => ({ ...prev, grossWeightKg: e.target.value }))} />
                  <Input label="Mã phiếu cân" value={weighInForm.ticketId} onChange={(e) => setWeighInForm((prev) => ({ ...prev, ticketId: e.target.value }))} />
                </div>
                <Button variant="accent" size="sm" onClick={handleWeighIn} disabled={recordWeighIn.isPending}>Ghi cân vào</Button>
              </div>
            )}

            {/* Cân ra - chỉ hiện khi PROCESSING */}
            {selected.status === 'PROCESSING' && (
              <div className="border-t border-moon-200 pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-navy-900">Cân ra & dung sai</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Trọng lượng bì (kg)" type="number" value={weighOutForm.tareWeightKg} onChange={(e) => setWeighOutForm((prev) => ({ ...prev, tareWeightKg: e.target.value }))} />
                  <Input label="Mã phiếu cân" value={weighOutForm.ticketId} onChange={(e) => setWeighOutForm((prev) => ({ ...prev, ticketId: e.target.value }))} />
                </div>
                <Button variant="accent" size="sm" onClick={handleWeighOut} disabled={recordWeighOut.isPending}>Ghi cân ra</Button>
              </div>
            )}

            {/* Nhập cân thủ công - chỉ hiện khi AWAITING_WEIGHING hoặc PROCESSING */}
            {['AWAITING_WEIGHING', 'PROCESSING'].includes(selected.status) && (
              <div className="border-t border-moon-200 pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-navy-900">Nhập cân thủ công</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Trọng lượng tổng" type="number" value={manualForm.grossWeightKg} onChange={(e) => setManualForm((prev) => ({ ...prev, grossWeightKg: e.target.value }))} />
                  <Input label="Trọng lượng bì" type="number" value={manualForm.tareWeightKg} onChange={(e) => setManualForm((prev) => ({ ...prev, tareWeightKg: e.target.value }))} />
                </div>
                <Input label="Mã lý do" value={manualForm.reasonCode} onChange={(e) => setManualForm((prev) => ({ ...prev, reasonCode: e.target.value }))} />
                <Textarea label="Ghi chú" rows={2} value={manualForm.note} onChange={(e) => setManualForm((prev) => ({ ...prev, note: e.target.value }))} />
                <Button variant="outline" size="sm" onClick={handleManual} disabled={applyManualWeight.isPending}>Áp dụng cân thủ công</Button>
              </div>
            )}

            {/* Thông báo khi đã hoàn thành cân */}
            {['WEIGHED_OUT', 'RECEIVED', 'REJECTED'].includes(selected.status) && (
              <div className="border-t border-moon-200 pt-4">
                <div className="rounded-xl border border-moon-300 bg-moon-50 p-4 text-sm text-navy-700">
                  <p className="font-semibold">Kết quả cân:</p>
                  <p>Tổng (Gross): {selected.grossWeightKg || 0} kg</p>
                  <p>Bì (Tare): {selected.tareWeightKg || 0} kg</p>
                  <p className="font-semibold">Ròng (Net): {selected.netWeightKg || 0} kg</p>
                  {selected.status === 'REJECTED' && (
                    <p className="text-red-600 mt-2">⚠️ Vượt dung sai - có thể cân lại (tối đa 3 lần)</p>
                  )}
                </div>
              </div>
            )}

            {(historyRows.length > 0 || weighRows.length > 0) && (
              <div className="border-t border-moon-200 pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-navy-900">Lịch sử & nhật ký cân</h4>
                <div className="space-y-2 text-sm text-navy-700 max-h-40 overflow-y-auto">
                  {historyRows.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-xl border border-moon-200 p-3">
                      <p className="font-semibold text-navy-800">{item.fromStatus} → {item.toStatus}</p>
                      <p className="text-xs text-navy-400">{item.action} · {item.actor}</p>
                    </div>
                  ))}
                  {weighRows.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-xl border border-moon-200 p-3">
                      <p className="font-semibold text-navy-800">{item.eventType} · {item.weightKg} kg</p>
                      <p className="text-xs text-navy-400">{item.ticketId || item.sourceApp}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
