import { useState } from 'react'
import { useOutboundPendingApprovals, useOutboundShipmentDetail, useApproveOutboundShipment, useRejectOutboundShipment, useOutboundShipmentExceptions } from '@domains/outbound-operations'
import { Badge, Button, Modal, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Textarea } from '@shared/ui'

const severityTone = (severity) => {
  if (severity === 'high') return 'danger'
  if (severity === 'medium') return 'warning'
  return 'default'
}

export function OutboundApprovalsPage() {
  const [selectedId, setSelectedId] = useState(null)
  const [approvalForm, setApprovalForm] = useState({ reasonCode: '', note: '' })

  const { data: pendingResponse, isLoading, refetch } = useOutboundPendingApprovals()
  const approveShipment = useApproveOutboundShipment()
  const rejectShipment = useRejectOutboundShipment()

  const rows = pendingResponse?.items || pendingResponse?.data || pendingResponse || []

  const { data: detailResponse } = useOutboundShipmentDetail(selectedId)
  const selected = detailResponse?.data || detailResponse || null

  const { data: exceptionsResponse } = useOutboundShipmentExceptions(selectedId)
  const exceptions = exceptionsResponse?.items || exceptionsResponse?.data || exceptionsResponse || []

  const openDetail = (id) => { setSelectedId(id); setApprovalForm({ reasonCode: '', note: '' }) }
  const closeDetail = () => setSelectedId(null)

  const handleApprove = async () => {
    if (!selected?.id) return
    await approveShipment.mutateAsync({ id: selected.id, data: approvalForm })
    setApprovalForm({ reasonCode: '', note: '' })
    closeDetail()
    refetch()
  }

  const handleReject = async () => {
    if (!selected?.id) return
    await rejectShipment.mutateAsync({ id: selected.id, data: approvalForm })
    setApprovalForm({ reasonCode: '', note: '' })
    closeDetail()
    refetch()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Pending approvals & exception governance</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Shipment</TableHead>
              <TableHead>Owner / Vehicle</TableHead>
              <TableHead>Exception</TableHead>
              <TableHead align="center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={4} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={4} message="No shipments pending approval" /> : null}
            {!isLoading ? rows.map((row) => {
              const linesPending = row.lines?.filter((l) => l.lineStatus === 'PENDING_APPROVAL') || []
              return (
                <TableRow key={row.id} onClick={() => openDetail(row.id)}>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-navy-900">{row.shipmentNumber}</p>
                      <p className="text-xs text-navy-400">{linesPending.length} dòng chờ phê duyệt</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-navy-800">{row.owner?.ownerCode || row.owner?.code || row.ownerId}</p>
                    <p className="text-xs text-navy-400">{row.vehicleNumber || 'N/A'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="warning">TOLERANCE_FAIL</Badge>
                  </TableCell>
                  <TableCell align="center">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(row.id)}>Xem chi tiết</Button>
                  </TableCell>
                </TableRow>
              )
            }) : null}
          </TableBody>
        </Table>
      </div>

      <Modal
        isOpen={!!selected}
        onClose={closeDetail}
        title={`Phê duyệt: ${selected?.shipmentNumber || ''}`}
        description="Xem xét chênh lệch và quyết định phê duyệt"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeDetail}>Đóng</Button>
            <Button variant="outline" onClick={handleReject} disabled={!approvalForm.reasonCode || rejectShipment.isPending}>
              {rejectShipment.isPending ? 'Đang từ chối...' : 'Từ chối & Hủy'}
            </Button>
            <Button variant="accent" onClick={handleApprove} disabled={!approvalForm.reasonCode || approveShipment.isPending}>
              {approveShipment.isPending ? 'Đang duyệt...' : 'Phê duyệt & Xuất hàng'}
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-5">
            {/* ── Thông tin chuyến hàng ── */}
            <div className="rounded-xl border border-moon-300 bg-moon-50/70 p-4 text-sm text-navy-700">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <p><span className="text-navy-400">Trạng thái:</span> <Badge variant="warning">{selected.status}</Badge></p>
                <p><span className="text-navy-400">Biển số xe:</span> <strong>{selected.vehicleNumber || '—'}</strong></p>
                <p><span className="text-navy-400">Owner:</span> <strong>{selected.owner?.ownerCode || selected.owner?.ownerName || '—'}</strong></p>
                <p><span className="text-navy-400">Kho:</span> <strong>{selected.warehouse?.warehouseCode || '—'}</strong></p>
                <p><span className="text-navy-400">Số dòng:</span> <strong>{selected.lines?.length || 0}</strong></p>
                <p><span className="text-navy-400">DPM:</span> <strong>{selected.isDpmShipment ? 'Có' : 'Không'}</strong></p>
                {selected.soId && <p><span className="text-navy-400">Mã SO:</span> <strong>{selected.soId}</strong></p>}
              </div>
              <div className="mt-3 pt-3 border-t border-moon-200 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-navy-400 mb-0.5">Cân bì (Tare)</p>
                  <p className="text-lg font-bold text-navy-900">{selected.tareWeightKg ? `${Number(selected.tareWeightKg).toLocaleString()} kg` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-400 mb-0.5">Tổng Gross</p>
                  <p className="text-lg font-bold text-navy-900">{selected.totalGrossKg ? `${Number(selected.totalGrossKg).toLocaleString()} kg` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-navy-400 mb-0.5">Tổng Net</p>
                  <p className="text-lg font-bold text-ice">{selected.totalNetKg ? `${Number(selected.totalNetKg).toLocaleString()} kg` : '—'}</p>
                </div>
              </div>
            </div>

            {/* ── Dòng cần phê duyệt ── */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Dòng hàng cần phê duyệt</h4>
              {(selected.lines || []).filter((l) => l.lineStatus === 'PENDING_APPROVAL').length === 0 && (
                <p className="text-sm text-navy-400">Không có dòng nào đang chờ phê duyệt</p>
              )}
              {(selected.lines || []).filter((l) => l.lineStatus === 'PENDING_APPROVAL').map((line) => (
                <div key={line.id} className="rounded-xl border border-red-200 bg-red-50/50 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-semibold text-navy-800">Dòng {line.lineNumber}: {line.item?.itemCode || line.item?.code || line.itemId} — {line.item?.itemName || ''}</p>
                    <Badge variant="danger">Chờ duyệt</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-navy-500">
                    <p>Dự kiến: <strong className="text-navy-700">{Number(line.expectedQty || 0).toLocaleString()} kg</strong></p>
                    <p>Thực cân (Net): <strong className="text-navy-700">{line.netWeightKg ? `${Number(line.netWeightKg).toLocaleString()} kg` : '—'}</strong></p>
                    <p>Gross: <strong className="text-navy-700">{line.grossWeightKg ? `${Number(line.grossWeightKg).toLocaleString()} kg` : '—'}</strong></p>
                  </div>
                  <div className="mt-1 text-xs">
                    <span className="text-red-600 font-semibold">Chênh lệch: {line.variancePct != null ? `${line.variancePct}%` : '—'}</span>
                    <span className="text-navy-400 ml-2">(Ngưỡng cho phép: {line.tolerancePctApplied || '—'}%)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Tất cả dòng hàng ── */}
            {(selected.lines || []).some((l) => l.lineStatus !== 'PENDING_APPROVAL') && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-navy-900">Dòng hàng khác</h4>
                {(selected.lines || []).filter((l) => l.lineStatus !== 'PENDING_APPROVAL').map((line) => (
                  <div key={line.id} className="rounded-xl border border-moon-200 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-navy-800">Dòng {line.lineNumber}: {line.item?.itemCode || line.item?.code || line.itemId}</p>
                      <Badge variant="info">{line.lineStatus}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-navy-500">
                      <p>Dự kiến: <strong>{Number(line.expectedQty || 0).toLocaleString()} kg</strong></p>
                      <p>Net: <strong>{line.netWeightKg ? `${Number(line.netWeightKg).toLocaleString()} kg` : '—'}</strong></p>
                      <p>Chênh lệch: <strong>{line.variancePct != null ? `${line.variancePct}%` : '—'}</strong></p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Chi tiết ngoại lệ ── */}
            {exceptions.length > 0 && (
              <div className="border-t border-moon-200 pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-navy-900">Chi tiết ngoại lệ</h4>
                {exceptions.map((exc) => (
                  <div key={exc.id} className="rounded-xl border border-moon-200 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-navy-800">{exc.exceptionType || exc.type}</p>
                      <Badge variant={severityTone(exc.severity)}>{exc.severity === 'HIGH' ? 'Cao' : exc.severity === 'MEDIUM' ? 'Trung bình' : 'Thấp'}</Badge>
                    </div>
                    <p className="text-xs text-navy-500">Mã lỗi: {exc.exceptionCode || exc.reasonCode || '—'}</p>
                    {exc.note && <p className="text-sm text-navy-700 mt-1">{exc.note}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* ── Quyết định quản lý ── */}
            <div className="border-t border-moon-200 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Quyết định của quản lý</h4>
              <Select label="Lý do *" value={approvalForm.reasonCode} onChange={(e) => setApprovalForm((prev) => ({ ...prev, reasonCode: e.target.value }))} options={[{ value: '', label: '-- Chọn lý do --' }, { value: 'MANAGER_OVERRIDE', label: 'Quản lý quyết định (Override)' }, { value: 'CUSTOMER_ACCEPTED', label: 'Khách hàng chấp nhận' }, { value: 'MEASUREMENT_ERROR', label: 'Lỗi đo lường / cân sai' }, { value: 'REJECTED_BY_MANAGER', label: 'Quản lý từ chối' }]} />
              <Textarea label="Ghi chú" rows={3} value={approvalForm.note} onChange={(e) => setApprovalForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Nhập lý do hoặc ghi chú cho quyết định..." />
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
