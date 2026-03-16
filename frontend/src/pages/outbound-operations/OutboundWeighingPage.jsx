import { useState } from 'react'
import { useOutboundShipments, useOutboundShipmentDetail, useRecordOutboundTare, useRecordOutboundGross, useOutboundWeighingHistory, useShipOutboundShipment } from '@domains/outbound-operations'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const weighingStatuses = ['ALLOCATED', 'PICKING', 'PICKED', 'WEIGHING_TARE', 'LOADING', 'ALL_WEIGHED']

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
  const [selectedId, setSelectedId] = useState(null)
  const [tareForm, setTareForm] = useState({ rawWeightKg: '', sourceMode: 'SCALE_AGENT', scaleTicketNo: '' })
  const [grossForm, setGrossForm] = useState({ lineId: '', rawWeightKg: '', sourceMode: 'SCALE_AGENT', scaleTicketNo: '' })

  const { data: response, isLoading, refetch } = useOutboundShipments({ ...filters, status: filters.status || undefined })
  const recordTare = useRecordOutboundTare()
  const recordGross = useRecordOutboundGross()
  const shipShipment = useShipOutboundShipment()

  const allRows = response?.items || response?.data || []
  const rows = allRows.filter((r) => weighingStatuses.includes(r.status))
  const pagination = { page: response?.page || 1, totalPages: response?.totalPages || 1 }

  const { data: detailResponse } = useOutboundShipmentDetail(selectedId)
  const selected = detailResponse?.data || detailResponse || null

  const { data: weighingHistoryResponse } = useOutboundWeighingHistory(selectedId)
  const weighingHistory = weighingHistoryResponse?.items || weighingHistoryResponse?.data || weighingHistoryResponse || []

  const openDetail = (id) => setSelectedId(id)
  const closeDetail = () => setSelectedId(null)

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
    closeDetail()
    refetch()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Thực hiện cân nhiều chuyến</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Quick status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {[{ value: '', label: 'Tất cả' }, { value: 'ALLOCATED', label: 'Đã phân bổ' }, { value: 'PICKING', label: 'Đang lấy hàng' }, { value: 'PICKED', label: 'Đã lấy xong' }, { value: 'WEIGHING_TARE', label: 'Cân bì' }, { value: 'LOADING', label: 'Đang xếp hàng' }, { value: 'ALL_WEIGHED', label: 'Đã cân xong' }].map((s) => (
            <button
              key={s.value}
              onClick={() => setFilters((prev) => ({ ...prev, status: s.value, page: 1 }))}
              className={[
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                filters.status === s.value
                  ? 'bg-ice text-navy-950 border-ice'
                  : 'bg-transparent text-navy-400 border-moon-200 hover:border-ice hover:text-ice',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Chuyến hàng</TableHead>
              <TableHead>Xe</TableHead>
              <TableHead align="right">Bì / Gross / Net</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={5} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="Không có chuyến hàng trong hàng đợi cân" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id} onClick={() => openDetail(row.id)}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.shipmentNumber}</p>
                    <p className="text-xs text-navy-400">{row._count?.lines || row.lines?.length || 0} dòng</p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.vehicleNumber || 'N/A'}</p>
                  <p className="text-xs text-navy-400">{row.owner?.ownerCode || row.owner?.code || row.ownerId}</p>
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
                    <Button variant="accent" size="sm" onClick={(e) => { e.stopPropagation(); shipShipment.mutate(row.id) }}>Xuất hàng</Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => openDetail(row.id)}>Chi tiết</Button>
                  )}
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
        title={`Chuyến hàng: ${selected?.shipmentNumber || ''}`}
        description="Chi tiết cân hàng và thao tác"
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            {/* ── Thông tin chuyến hàng ── */}
            <div className="rounded-xl border border-moon-300 bg-moon-50/70 p-4 text-sm text-navy-700">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <p><span className="text-navy-400">Trạng thái:</span> <Badge variant={statusTone(selected.status)}>{selected.status}</Badge></p>
                <p><span className="text-navy-400">Biển số xe:</span> <strong>{selected.vehicleNumber || '—'}</strong></p>
                <p><span className="text-navy-400">Owner:</span> <strong>{selected.owner?.ownerCode || selected.owner?.ownerName || '—'}</strong></p>
                <p><span className="text-navy-400">Kho:</span> <strong>{selected.warehouse?.warehouseCode || '—'}</strong></p>
                <p><span className="text-navy-400">Số dòng:</span> <strong>{selected.lines?.length || 0}</strong></p>
                {selected.soId && <p><span className="text-navy-400">Mã SO:</span> <strong>{selected.soId}</strong></p>}
              </div>
              <div className="mt-3 pt-3 border-t border-moon-200 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-navy-400 mb-0.5">Cân bì (Tare)</p>
                  <p className="text-lg font-bold text-navy-900">{selected.tareWeightKg ? `${Number(selected.tareWeightKg).toLocaleString()} kg` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-400 mb-0.5">Tổng cân hàng (Gross)</p>
                  <p className="text-lg font-bold text-navy-900">{selected.totalGrossKg ? `${Number(selected.totalGrossKg).toLocaleString()} kg` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-400 mb-0.5">Tổng thực (Net)</p>
                  <p className="text-lg font-bold text-ice">{selected.totalNetKg ? `${Number(selected.totalNetKg).toLocaleString()} kg` : '—'}</p>
                </div>
              </div>
            </div>

            {/* ── Danh sách dòng hàng ── */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Danh sách dòng hàng</h4>
              {(selected.lines || []).map((line) => (
                <div key={line.id} className="rounded-xl border border-moon-200 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-semibold text-navy-800">Dòng {line.lineNumber}: {line.item?.itemCode || line.item?.code || line.itemId} — {line.item?.itemName || ''}</p>
                    <Badge variant={lineTone(line.lineStatus)}>{line.lineStatus}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-navy-500">
                    <p>Dự kiến: <strong className="text-navy-700">{Number(line.expectedQty || 0).toLocaleString()} kg</strong></p>
                    <p>Đã phân bổ: <strong className="text-navy-700">{Number(line.allocatedQty || 0).toLocaleString()} kg</strong></p>
                    <p>Hình thức: <strong className="text-navy-700">{line.cargoForm}</strong></p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-navy-500 mt-1">
                    <p>Gross: <strong className="text-navy-700">{line.grossWeightKg ? `${Number(line.grossWeightKg).toLocaleString()} kg` : '—'}</strong></p>
                    <p>Net: <strong className="text-navy-700">{line.netWeightKg ? `${Number(line.netWeightKg).toLocaleString()} kg` : '—'}</strong></p>
                    <p>Chênh lệch: <strong className={`${line.variancePct != null && Math.abs(line.variancePct) > (line.tolerancePctApplied || 2) ? 'text-red-600' : 'text-navy-700'}`}>{line.variancePct != null ? `${line.variancePct}%` : '—'}</strong></p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Ghi cân bì (Tare) ── */}
            <div className="border-t border-moon-200 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Ghi cân bì (xe không tải)</h4>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Khối lượng (kg)" type="number" value={tareForm.rawWeightKg} onChange={(e) => setTareForm((prev) => ({ ...prev, rawWeightKg: e.target.value }))} placeholder="VD: 8500" />
                <Select label="Nguồn cân" value={tareForm.sourceMode} onChange={(e) => setTareForm((prev) => ({ ...prev, sourceMode: e.target.value }))} options={[{ value: 'SCALE_AGENT', label: 'Trạm cân tự động' }, { value: 'MANUAL', label: 'Nhập tay' }]} />
                <Input label="Số phiếu cân" value={tareForm.scaleTicketNo} onChange={(e) => setTareForm((prev) => ({ ...prev, scaleTicketNo: e.target.value }))} placeholder="VD: T-001" />
              </div>
              <Button variant="accent" size="sm" onClick={handleTare} disabled={!['PICKED', 'ALLOCATED'].includes(selected.status) || !tareForm.rawWeightKg || recordTare.isPending}>
                {recordTare.isPending ? 'Đang ghi...' : 'Ghi cân bì'}
              </Button>
            </div>

            {/* ── Ghi cân hàng (Gross) ── */}
            <div className="border-t border-moon-200 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Ghi cân hàng (từng dòng)</h4>
              <Select label="Chọn dòng hàng" value={grossForm.lineId} onChange={(e) => setGrossForm((prev) => ({ ...prev, lineId: e.target.value }))} options={[{ value: '', label: '-- Chọn dòng --' }, ...(selected.lines || []).filter((l) => l.lineStatus !== 'LINE_SHIPPED').map((line) => ({ value: line.id, label: `Dòng ${line.lineNumber}: ${line.item?.itemCode || line.itemId} — ${Number(line.expectedQty || 0).toLocaleString()} kg` }))]} />
              <div className="grid grid-cols-3 gap-3">
                <Input label="Khối lượng (kg)" type="number" value={grossForm.rawWeightKg} onChange={(e) => setGrossForm((prev) => ({ ...prev, rawWeightKg: e.target.value }))} placeholder="VD: 30500" />
                <Select label="Nguồn cân" value={grossForm.sourceMode} onChange={(e) => setGrossForm((prev) => ({ ...prev, sourceMode: e.target.value }))} options={[{ value: 'SCALE_AGENT', label: 'Trạm cân tự động' }, { value: 'MANUAL', label: 'Nhập tay' }]} />
                <Input label="Số phiếu cân" value={grossForm.scaleTicketNo} onChange={(e) => setGrossForm((prev) => ({ ...prev, scaleTicketNo: e.target.value }))} placeholder="VD: G-001" />
              </div>
              <Button variant="accent" size="sm" onClick={handleGross} disabled={!grossForm.lineId || !grossForm.rawWeightKg || !selected.tareWeightKg || recordGross.isPending}>
                {recordGross.isPending ? 'Đang ghi...' : 'Ghi cân hàng'}
              </Button>
            </div>

            {/* ── Lịch sử cân ── */}
            {weighingHistory.length > 0 && (
              <div className="border-t border-moon-200 pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-navy-900">Lịch sử cân</h4>
                <div className="space-y-2 text-sm text-navy-700 max-h-40 overflow-y-auto">
                  {weighingHistory.map((item) => (
                    <div key={item.id} className="rounded-xl border border-moon-200 p-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-navy-800">{item.eventType === 'TARE' ? 'Cân bì' : item.eventType === 'GROSS' ? 'Cân hàng' : item.eventType}</p>
                        <p className="text-xs text-navy-400">{item.scaleTicketNo ? `Phiếu: ${item.scaleTicketNo}` : ''} {item.sourceMode === 'MANUAL' ? '(Nhập tay)' : '(Tự động)'}</p>
                      </div>
                      <p className="font-bold text-navy-900">{Number(item.rawWeightKg || 0).toLocaleString()} kg</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Nút Ship ── */}
            {selected.status === 'ALL_WEIGHED' && (
              <div className="border-t border-moon-200 pt-4 flex justify-end">
                <Button variant="accent" onClick={handleShip} disabled={shipShipment.isPending}>
                  {shipShipment.isPending ? 'Đang xuất...' : 'Xác nhận xuất hàng'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
