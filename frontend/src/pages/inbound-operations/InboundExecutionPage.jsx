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
        <h2 className="section-title">Weighbridge execution & tolerance</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'All' }, { value: 'AWAITING_WEIGHING', label: 'AWAITING_WEIGHING' }, { value: 'WEIGHED_IN', label: 'WEIGHED_IN' }, { value: 'PROCESSING', label: 'PROCESSING' }, { value: 'WEIGHED_OUT', label: 'WEIGHED_OUT' }, { value: 'REJECTED', label: 'REJECTED' }]} placeholder="Execution status" className="max-w-xs" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Receipt</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead align="right">Gross / Tare / Net</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={5} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="No receipts in execution queue" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id} onClick={() => openDetail(row.id)}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.receiptNumber}</p>
                    <p className="text-xs text-navy-400">Attempt {row.attemptNumber}</p>
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
                  {row.status === 'WEIGHED_IN' ? <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); startProcessing.mutate(row.id) }}>Start processing</Button> : <Button variant="ghost" size="sm" onClick={() => openDetail(row.id)}>Detail</Button>}
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
        title={`Receipt: ${selected?.receiptNumber || ''}`}
        description="Weighbridge execution details and actions"
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-xl border border-moon-300 bg-moon-50/70 p-4 text-sm text-navy-700 grid grid-cols-2 gap-2">
              <p><strong>Status:</strong> {selected.status}</p>
              <p><strong>Expected:</strong> {selected.expectedQty} kg</p>
              <p><strong>Tolerance:</strong> {selected.tolerancePctApplied ?? '—'}%</p>
              <p><strong>Variance:</strong> {selected.variancePct ?? '—'}%</p>
            </div>

            <div className="border-t border-moon-200 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Weigh-in</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Gross weight (kg)" type="number" value={weighInForm.grossWeightKg} onChange={(e) => setWeighInForm((prev) => ({ ...prev, grossWeightKg: e.target.value }))} />
                <Input label="Ticket ID" value={weighInForm.ticketId} onChange={(e) => setWeighInForm((prev) => ({ ...prev, ticketId: e.target.value }))} />
              </div>
              <Button variant="accent" size="sm" onClick={handleWeighIn} disabled={recordWeighIn.isPending}>Record Weigh-In</Button>
            </div>

            <div className="border-t border-moon-200 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Weigh-out & tolerance</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tare weight (kg)" type="number" value={weighOutForm.tareWeightKg} onChange={(e) => setWeighOutForm((prev) => ({ ...prev, tareWeightKg: e.target.value }))} />
                <Input label="Ticket ID" value={weighOutForm.ticketId} onChange={(e) => setWeighOutForm((prev) => ({ ...prev, ticketId: e.target.value }))} />
              </div>
              <Button variant="accent" size="sm" onClick={handleWeighOut} disabled={recordWeighOut.isPending}>Record Weigh-Out</Button>
            </div>

            <div className="border-t border-moon-200 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Manual weight fallback</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Gross weight" type="number" value={manualForm.grossWeightKg} onChange={(e) => setManualForm((prev) => ({ ...prev, grossWeightKg: e.target.value }))} />
                <Input label="Tare weight" type="number" value={manualForm.tareWeightKg} onChange={(e) => setManualForm((prev) => ({ ...prev, tareWeightKg: e.target.value }))} />
              </div>
              <Input label="Reason code" value={manualForm.reasonCode} onChange={(e) => setManualForm((prev) => ({ ...prev, reasonCode: e.target.value }))} />
              <Textarea label="Note" rows={2} value={manualForm.note} onChange={(e) => setManualForm((prev) => ({ ...prev, note: e.target.value }))} />
              <Button variant="outline" size="sm" onClick={handleManual} disabled={applyManualWeight.isPending}>Apply Manual Weight</Button>
            </div>

            {(historyRows.length > 0 || weighRows.length > 0) && (
              <div className="border-t border-moon-200 pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-navy-900">History & weigh logs</h4>
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
