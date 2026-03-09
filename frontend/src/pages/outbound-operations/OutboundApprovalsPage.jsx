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
          <h2 className="section-title">Pending approvals & exception governance</h2>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
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
                  <TableRow key={row.id} onClick={() => setSelectedId(row.id)} className={selected?.id === row.id ? 'bg-muted/60' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-navy-900">{row.shipmentNumber}</p>
                        <p className="text-xs text-navy-400">{linesPending.length} line(s) pending</p>
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
                      <span className="text-xs text-navy-400">Select row</span>
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
              <h3 className="text-sm font-semibold text-navy-900">Selected Shipment</h3>
              <p className="text-sm text-navy-400">{selected?.shipmentNumber || 'Select a shipment from the list'}</p>
            </div>
            {selected ? (
              <div className="rounded-xl border border-moon-300 bg-moon-50/70 p-4 text-sm text-navy-700 space-y-1">
                <p><strong>Status:</strong> {selected.status}</p>
                <p><strong>Owner:</strong> {selected.owner?.code || selected.ownerId}</p>
                <p><strong>Vehicle:</strong> {selected.vehicleNumber || 'N/A'}</p>
                <p><strong>DPM Shipment:</strong> {selected.isDpmShipment ? 'Yes' : 'No'}</p>
                <p><strong>Total Net:</strong> {selected.totalNetKg?.toLocaleString() || '—'} kg</p>
              </div>
            ) : null}
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Lines Pending Approval</h3>
            {selected?.lines?.filter((l) => l.lineStatus === 'PENDING_APPROVAL').map((line) => (
              <div key={line.id} className="rounded-xl border border-danger/30 bg-danger/5 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-navy-800">Line {line.lineNumber}: {line.item?.code || line.itemId}</p>
                  <Badge variant="danger">{line.lineStatus}</Badge>
                </div>
                <p className="text-xs text-navy-500">Expected: {line.expectedQty?.toLocaleString()} kg · Net: {line.netWeightKg?.toLocaleString()} kg</p>
                <p className="text-xs text-danger">Variance: {line.variancePct}% (tolerance: {line.tolerancePctApplied}%)</p>
              </div>
            ))}
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Exception Details</h3>
            {exceptions.length === 0 ? (
              <p className="text-sm text-navy-400">No exceptions</p>
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
            <h3 className="text-sm font-semibold text-navy-900">Manager Decision</h3>
            <Select label="Reason code" value={approvalForm.reasonCode} onChange={(e) => setApprovalForm((prev) => ({ ...prev, reasonCode: e.target.value }))} options={[{ value: 'MANAGER_OVERRIDE', label: 'MANAGER_OVERRIDE' }, { value: 'CUSTOMER_ACCEPTED', label: 'CUSTOMER_ACCEPTED' }, { value: 'MEASUREMENT_ERROR', label: 'MEASUREMENT_ERROR' }, { value: 'REJECTED_BY_MANAGER', label: 'REJECTED_BY_MANAGER' }]} placeholder="Select reason code" />
            <Textarea label="Note" rows={3} value={approvalForm.note} onChange={(e) => setApprovalForm((prev) => ({ ...prev, note: e.target.value }))} />
            <div className="flex gap-3">
              <Button variant="accent" onClick={handleApprove} disabled={!selected || approveShipment.isPending}>
                Approve & Ship
              </Button>
              <Button variant="outline" onClick={handleReject} disabled={!selected || rejectShipment.isPending}>
                Reject & Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
