import { useState } from 'react'
import { useOutboundPendingApprovals, useApproveOutboundShipment, useRejectOutboundShipment, useOutboundShipmentExceptions } from '@domains/outbound-operations'
import { Badge, Button, Input, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Textarea } from '@shared/ui'

const severityTone = (severity) => {
  if (severity === 'high') return 'danger'
  if (severity === 'medium') return 'warning'
  return 'default'
}

export function OutboundApprovalsPage() {
  const [selectedId, setSelectedId] = useState('')
  const [approvalForm, setApprovalForm] = useState({ reasonCode: '', note: '' })

  const { data: pendingResponse, isLoading, refetch } = useOutboundPendingApprovals()
  const approveShipment = useApproveOutboundShipment()
  const rejectShipment = useRejectOutboundShipment()

  const rows = pendingResponse?.data || []
  const selected = rows.find((r) => r.id === selectedId) || rows[0]

  const { data: exceptionsResponse } = useOutboundShipmentExceptions(selected?.id)
  const exceptions = exceptionsResponse?.data || []

  const handleApprove = async () => {
    if (!selected?.id) return
    await approveShipment.mutateAsync({ id: selected.id, data: approvalForm })
    setApprovalForm({ reasonCode: '', note: '' })
    refetch()
  }

  const handleReject = async () => {
    if (!selected?.id) return
    await rejectShipment.mutateAsync({ id: selected.id, data: approvalForm })
    setApprovalForm({ reasonCode: '', note: '' })
    refetch()
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h2 className="section-title">Chờ duyệt & quản lý ngoại lệ</h2>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="wrs-card p-5 space-y-4">
          <Table>
            <TableHeader>
              <TableRow hoverable={false}>
                <TableHead>Phiếu xuất</TableHead>
                <TableHead>Chủ hàng / Xe</TableHead>
                <TableHead>Ngoại lệ</TableHead>
                <TableHead align="center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableLoading colSpan={4} /> : null}
              {!isLoading && rows.length === 0 ? <TableEmpty colSpan={4} message="Không có phiếu xuất chờ duyệt" /> : null}
              {!isLoading ? rows.map((row) => {
                const linesPending = row.lines?.filter((l) => l.lineStatus === 'PENDING_APPROVAL') || []
                return (
                  <TableRow key={row.id} onClick={() => setSelectedId(row.id)} className={selected?.id === row.id ? 'bg-muted/60' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-navy-900">{row.shipmentNumber}</p>
                        <p className="text-xs text-navy-400">{linesPending.length} dòng chờ duyệt</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-navy-800">{row.owner?.code || row.ownerId}</p>
                      <p className="text-xs text-navy-400">{row.vehicleNumber || 'N/A'}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="warning">TOLERANCE_FAIL</Badge>
                    </TableCell>
                    <TableCell align="center">
                      <span className="text-xs text-navy-400">Chọn dòng</span>
                    </TableCell>
                  </TableRow>
                )
              }) : null}
            </TableBody>
          </Table>
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
                <p><strong>Chủ hàng:</strong> {selected.owner?.code || selected.ownerId}</p>
                <p><strong>Xe:</strong> {selected.vehicleNumber || 'N/A'}</p>
                <p><strong>Phiếu DPM:</strong> {selected.isDpmShipment ? 'Có' : 'Không'}</p>
                <p><strong>Tổng tịnh:</strong> {selected.totalNetKg?.toLocaleString() || '—'} kg</p>
              </div>
            ) : null}
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Dòng chờ duyệt</h3>
            {selected?.lines?.filter((l) => l.lineStatus === 'PENDING_APPROVAL').map((line) => (
              <div key={line.id} className="rounded-xl border border-danger/30 bg-danger/5 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-navy-800">Dòng {line.lineNumber}: {line.item?.code || line.itemId}</p>
                  <Badge variant="danger">{line.lineStatus}</Badge>
                </div>
                <p className="text-xs text-navy-500">Dự kiến: {line.expectedQty?.toLocaleString()} kg · Tịnh: {line.netWeightKg?.toLocaleString()} kg</p>
                <p className="text-xs text-danger">Chênh lệch: {line.variancePct}% (dung sai: {line.tolerancePctApplied}%)</p>
              </div>
            ))}
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Chi tiết ngoại lệ</h3>
            {exceptions.length === 0 ? (
              <p className="text-sm text-navy-400">Không có ngoại lệ</p>
            ) : (
              exceptions.map((exc) => (
                <div key={exc.id} className="rounded-xl border border-moon-200 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-navy-800">{exc.type}</p>
                    <Badge variant={severityTone(exc.severity)}>{exc.severity}</Badge>
                  </div>
                  <p className="text-xs text-navy-500">{exc.reasonCode}</p>
                  <p className="text-sm text-navy-700">{exc.note}</p>
                </div>
              ))
            )}
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Quyết định quản lý</h3>
            <Select label="Mã lý do" value={approvalForm.reasonCode} onChange={(e) => setApprovalForm((prev) => ({ ...prev, reasonCode: e.target.value }))} options={[{ value: 'MANAGER_OVERRIDE', label: 'MANAGER_OVERRIDE' }, { value: 'CUSTOMER_ACCEPTED', label: 'CUSTOMER_ACCEPTED' }, { value: 'MEASUREMENT_ERROR', label: 'MEASUREMENT_ERROR' }, { value: 'REJECTED_BY_MANAGER', label: 'REJECTED_BY_MANAGER' }]} placeholder="Chọn mã lý do" />
            <Textarea label="Ghi chú" rows={3} value={approvalForm.note} onChange={(e) => setApprovalForm((prev) => ({ ...prev, note: e.target.value }))} />
            <div className="flex gap-3">
              <Button variant="accent" onClick={handleApprove} disabled={!selected || approveShipment.isPending}>
                Duyệt & xuất hàng
              </Button>
              <Button variant="outline" onClick={handleReject} disabled={!selected || rejectShipment.isPending}>
                Từ chối & hủy
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
