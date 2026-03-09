import { useMemo, useState } from 'react'
import { CheckCircle2, Scale, TimerReset, Weight } from 'lucide-react'
import { useApplyInboundManualWeight, useInboundReceiptHistory, useInboundReceipts, useInboundWeighLogs, useRecordInboundWeighIn, useRecordInboundWeighOut, useStartInboundProcessing } from '@domains/inbound-operations'
import { Badge, Button, Input, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Textarea } from '@shared/ui'

const executionRows = ['AWAITING_WEIGHING', 'WEIGHED_IN', 'PROCESSING', 'WEIGHED_OUT', 'REJECTED']

const statusTone = (status) => {
  if (status === 'RECEIVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  if (['WEIGHED_IN', 'PROCESSING', 'WEIGHED_OUT'].includes(status)) return 'warning'
  return 'default'
}

export function InboundExecutionPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, status: '' })
  const [selectedId, setSelectedId] = useState('')
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
  const selected = rows.find((item) => item.id === selectedId) || rows[0]

  const { data: historyResponse } = useInboundReceiptHistory(selected?.id)
  const { data: weighLogsResponse } = useInboundWeighLogs(selected?.id)

  const historyRows = historyResponse?.data || []
  const weighRows = weighLogsResponse?.data || []

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
    <div className="page-section">
      <div className="page-header">
        <div>
          <h2 className="section-title">Thực thi cân & dung sai</h2>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="wrs-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'AWAITING_WEIGHING', label: 'AWAITING_WEIGHING' }, { value: 'WEIGHED_IN', label: 'WEIGHED_IN' }, { value: 'PROCESSING', label: 'PROCESSING' }, { value: 'WEIGHED_OUT', label: 'WEIGHED_OUT' }, { value: 'REJECTED', label: 'REJECTED' }]} placeholder="Execution status" className="max-w-xs" />
          </div>

          <Table>
            <TableHeader>
              <TableRow hoverable={false}>
                <TableHead>Phiếu nhập</TableHead>
                <TableHead>Xe</TableHead>
                <TableHead align="right">Tổng / Bì / Tịnh</TableHead>
                <TableHead align="center">Trạng thái</TableHead>
                <TableHead align="center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableLoading colSpan={5} /> : null}
              {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="Không có phiếu nhập trong hàng đợi thực thi" /> : null}
              {!isLoading ? rows.map((row) => (
                <TableRow key={row.id} onClick={() => setSelectedId(row.id)} className={selected?.id === row.id ? 'bg-muted/60' : ''}>
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
                    {row.status === 'WEIGHED_IN' ? <Button variant="outline" size="sm" onClick={() => startProcessing.mutate(row.id)}>Bắt đầu xử lý</Button> : <span className="text-xs text-navy-400">Chọn dòng</span>}
                  </TableCell>
                </TableRow>
              )) : null}
            </TableBody>
          </Table>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
        </div>

        <div className="space-y-5">
          <div className="wrs-card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-navy-900">Phiếu nhập đã chọn</h3>
              <p className="text-sm text-navy-400">{selected?.receiptNumber || 'Chọn phiếu nhập từ danh sách'}</p>
            </div>
            {selected ? (
              <div className="rounded-xl border border-moon-300 bg-moon-50/70 p-4 text-sm text-navy-700">
                <p><strong>Trạng thái:</strong> {selected.status}</p>
                <p><strong>Dự kiến:</strong> {selected.expectedQty} kg</p>
                <p><strong>Dung sai:</strong> {selected.tolerancePctApplied ?? '—'}%</p>
                <p><strong>Chênh lệch:</strong> {selected.variancePct ?? '—'}%</p>
              </div>
            ) : null}
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Cân vào</h3>
            <Input label="Trọng lượng tổng (kg)" type="number" value={weighInForm.grossWeightKg} onChange={(e) => setWeighInForm((prev) => ({ ...prev, grossWeightKg: e.target.value }))} />
            <Input label="Mã phiếu cân" value={weighInForm.ticketId} onChange={(e) => setWeighInForm((prev) => ({ ...prev, ticketId: e.target.value }))} />
            <Button variant="accent" onClick={handleWeighIn} disabled={!selected || recordWeighIn.isPending}>Ghi cân vào</Button>
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Cân ra & dung sai</h3>
            <Input label="Trọng lượng bì (kg)" type="number" value={weighOutForm.tareWeightKg} onChange={(e) => setWeighOutForm((prev) => ({ ...prev, tareWeightKg: e.target.value }))} />
            <Input label="Mã phiếu cân" value={weighOutForm.ticketId} onChange={(e) => setWeighOutForm((prev) => ({ ...prev, ticketId: e.target.value }))} />
            <Button variant="accent" onClick={handleWeighOut} disabled={!selected || recordWeighOut.isPending}>Ghi cân ra</Button>
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Nhập cân thủ công</h3>
            <Input label="Trọng lượng tổng" type="number" value={manualForm.grossWeightKg} onChange={(e) => setManualForm((prev) => ({ ...prev, grossWeightKg: e.target.value }))} />
            <Input label="Trọng lượng bì" type="number" value={manualForm.tareWeightKg} onChange={(e) => setManualForm((prev) => ({ ...prev, tareWeightKg: e.target.value }))} />
            <Input label="Mã lý do" value={manualForm.reasonCode} onChange={(e) => setManualForm((prev) => ({ ...prev, reasonCode: e.target.value }))} />
            <Textarea label="Ghi chú" rows={3} value={manualForm.note} onChange={(e) => setManualForm((prev) => ({ ...prev, note: e.target.value }))} />
            <Button variant="outline" onClick={handleManual} disabled={!selected || applyManualWeight.isPending}>Áp dụng cân thủ công</Button>
          </div>

          <div className="wrs-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-navy-900">Lịch sử & nhật ký cân</h3>
            <div className="space-y-2 text-sm text-navy-700">
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
        </div>
      </div>
    </div>
  )
}
