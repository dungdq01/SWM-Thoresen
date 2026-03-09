import { useState } from 'react'
import { useOutboundShipments, useRecordOutboundTare, useRecordOutboundGross, useOutboundWeighingHistory, useShipOutboundShipment } from '@domains/outbound-operations'
import { Badge, Button, Input, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const weighingStatuses = ['PICKED', 'WEIGHING_TARE', 'LOADING', 'ALL_WEIGHED']

const statusTone = (status) => {
  if (status === 'ALL_WEIGHED') return 'success'
  if (['WEIGHING_TARE', 'LOADING'].includes(status)) return 'warning'
  return 'info'
}

const lineTone = (lineStatus) => {
  if (lineStatus === 'LINE_SHIPPED') return 'success'
  if (lineStatus === 'PENDING_APPROVAL') return 'danger'
  if (['PICKED', 'LOADING'].includes(lineStatus)) return 'info'
  return 'default'
}

export function OutboundWeighingPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, status: '' })
  const [selectedId, setSelectedId] = useState('')
  const [tareForm, setTareForm] = useState({ rawWeightKg: '', sourceMode: 'SCALE_AGENT', scaleTicketNo: '' })
  const [grossForm, setGrossForm] = useState({ lineId: '', rawWeightKg: '', sourceMode: 'SCALE_AGENT', scaleTicketNo: '' })

  const { data: response, isLoading, refetch } = useOutboundShipments({ ...filters, status: filters.status || undefined })
  const recordTare = useRecordOutboundTare()
  const recordGross = useRecordOutboundGross()
  const shipShipment = useShipOutboundShipment()

  const allRows = response?.data || []
  const rows = allRows.filter((r) => weighingStatuses.includes(r.status))
  const pagination = response?.pagination || { page: 1, totalPages: 1 }
  const selected = rows.find((r) => r.id === selectedId) || rows[0]

  const { data: weighingHistoryResponse } = useOutboundWeighingHistory(selected?.id)
  const weighingHistory = weighingHistoryResponse?.data || []

  const handleTare = async () => {
    if (!selected?.id) return
    await recordTare.mutateAsync({ id: selected.id, data: tareForm })
    setTareForm({ rawWeightKg: '', sourceMode: 'SCALE_AGENT', scaleTicketNo: '' })
    refetch()
  }

  const handleGross = async () => {
    if (!selected?.id || !grossForm.lineId) return
    await recordGross.mutateAsync({ id: selected.id, data: grossForm })
    setGrossForm({ lineId: '', rawWeightKg: '', sourceMode: 'SCALE_AGENT', scaleTicketNo: '' })
    refetch()
  }

  const handleShip = async () => {
    if (!selected?.id) return
    await shipShipment.mutateAsync(selected.id)
    refetch()
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h2 className="section-title">Thực thi cân đa chuyến</h2>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="wrs-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'PICKED', label: 'PICKED (ready to weigh)' }, { value: 'WEIGHING_TARE', label: 'WEIGHING_TARE' }, { value: 'LOADING', label: 'LOADING' }, { value: 'ALL_WEIGHED', label: 'ALL_WEIGHED' }]} placeholder="Weighing status" className="max-w-xs" />
          </div>

          <Table>
            <TableHeader>
              <TableRow hoverable={false}>
                <TableHead>Phiếu xuất</TableHead>
                <TableHead>Xe</TableHead>
                <TableHead align="right">Bì / Tổng / Tịnh</TableHead>
                <TableHead align="center">Trạng thái</TableHead>
                <TableHead align="center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableLoading colSpan={5} /> : null}
              {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="Không có phiếu xuất trong hàng đợi cân" /> : null}
              {!isLoading ? rows.map((row) => (
                <TableRow key={row.id} onClick={() => setSelectedId(row.id)} className={selected?.id === row.id ? 'bg-muted/60' : ''}>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-navy-900">{row.shipmentNumber}</p>
                      <p className="text-xs text-navy-400">{row.lines?.length || 0} dòng</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-800">{row.vehicleNumber || 'N/A'}</p>
                    <p className="text-xs text-navy-400">{row.owner?.code || row.ownerId}</p>
                  </TableCell>
                  <TableCell align="right">
                    <div className="text-sm">
                      <p>T: {row.tareWeightKg || 0}</p>
                      <p>G: {row.totalGrossKg || 0}</p>
                      <p className="font-semibold text-navy-900">N: {row.totalNetKg || 0}</p>
                    </div>
                  </TableCell>
                  <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                  <TableCell align="center">
                    {row.status === 'ALL_WEIGHED' ? (
                      <Button variant="accent" size="sm" onClick={() => shipShipment.mutate(row.id)}>Xuất hàng</Button>
                    ) : (
                      <span className="text-xs text-navy-400">Chọn dòng</span>
                    )}
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
              <h3 className="text-sm font-semibold text-navy-900">Phiếu xuất đã chọn</h3>
              <p className="text-sm text-navy-400">{selected?.shipmentNumber || 'Chọn phiếu xuất từ danh sách'}</p>
            </div>
            {selected ? (
              <div className="rounded-xl border border-moon-300 bg-moon-50/70 p-4 text-sm text-navy-700 space-y-1">
                <p><strong>Trạng thái:</strong> {selected.status}</p>
                <p><strong>Bì:</strong> {selected.tareWeightKg || '—'} kg</p>
                <p><strong>Tổng tổng:</strong> {selected.totalGrossKg || '—'} kg</p>
                <p><strong>Tổng tịnh:</strong> {selected.totalNetKg || '—'} kg</p>
              </div>
            ) : null}
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Ghi cân bì (xe không)</h3>
            <Input label="Trọng lượng thô (kg)" type="number" value={tareForm.rawWeightKg} onChange={(e) => setTareForm((prev) => ({ ...prev, rawWeightKg: e.target.value }))} />
            <Select label="Nguồn dữ liệu" value={tareForm.sourceMode} onChange={(e) => setTareForm((prev) => ({ ...prev, sourceMode: e.target.value }))} options={[{ value: 'SCALE_AGENT', label: 'SCALE_AGENT' }, { value: 'MANUAL', label: 'MANUAL' }]} />
            <Input label="Số phiếu cân" value={tareForm.scaleTicketNo} onChange={(e) => setTareForm((prev) => ({ ...prev, scaleTicketNo: e.target.value }))} />
            <Button variant="accent" onClick={handleTare} disabled={!selected || selected.status !== 'PICKED' || recordTare.isPending}>Ghi cân bì</Button>
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Ghi cân tổng (theo dòng)</h3>
            <Select label="Dòng" value={grossForm.lineId} onChange={(e) => setGrossForm((prev) => ({ ...prev, lineId: e.target.value }))} options={(selected?.lines || []).filter((l) => l.lineStatus !== 'LINE_SHIPPED').map((line) => ({ value: line.id, label: `Line ${line.lineNumber}: ${line.item?.code || line.itemId}` }))} placeholder="Chọn dòng" />
            <Input label="Trọng lượng thô (kg)" type="number" value={grossForm.rawWeightKg} onChange={(e) => setGrossForm((prev) => ({ ...prev, rawWeightKg: e.target.value }))} />
            <Select label="Nguồn dữ liệu" value={grossForm.sourceMode} onChange={(e) => setGrossForm((prev) => ({ ...prev, sourceMode: e.target.value }))} options={[{ value: 'SCALE_AGENT', label: 'SCALE_AGENT' }, { value: 'MANUAL', label: 'MANUAL' }]} />
            <Input label="Số phiếu cân" value={grossForm.scaleTicketNo} onChange={(e) => setGrossForm((prev) => ({ ...prev, scaleTicketNo: e.target.value }))} />
            <Button variant="accent" onClick={handleGross} disabled={!selected || !selected.tareWeightKg || recordGross.isPending}>Ghi cân tổng</Button>
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Dòng & dung sai</h3>
            {selected?.lines?.map((line) => (
              <div key={line.id} className="rounded-xl border border-moon-200 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-navy-800">Dòng {line.lineNumber}: {line.item?.code || line.itemId}</p>
                  <Badge variant={lineTone(line.lineStatus)}>{line.lineStatus}</Badge>
                </div>
                <p className="text-xs text-navy-500">Dự kiến: {line.expectedQty?.toLocaleString()} kg · Dung sai: {line.tolerancePctApplied}%</p>
                <p className="text-xs text-navy-500">Tổng: {line.grossWeightKg || '—'} · Tịnh: {line.netWeightKg || '—'} · Chênh lệch: {line.variancePct ?? '—'}%</p>
              </div>
            ))}
          </div>

          <div className="wrs-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-navy-900">Lịch sử cân</h3>
            <div className="space-y-2 text-sm text-navy-700 max-h-48 overflow-y-auto">
              {weighingHistory.length === 0 ? (
                <p className="text-navy-400">Chưa có lịch sử cân</p>
              ) : (
                weighingHistory.map((item) => (
                  <div key={item.id} className="rounded-xl border border-moon-200 p-3">
                    <p className="font-semibold text-navy-800">{item.eventType} · {item.rawWeightKg} kg</p>
                    <p className="text-xs text-navy-400">{item.scaleTicketNo || item.sourceMode}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
