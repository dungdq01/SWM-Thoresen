import { useState } from 'react'
import { useOutboundShipments, useRecordOutboundTare, useRecordOutboundGross, useOutboundWeighingHistory, useShipOutboundShipment } from '@domains/outbound-operations'
import { Badge, Button, Input, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

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
  const [selectedId, setSelectedId] = useState(null)
  const [tareForm, setTareForm] = useState({ rawWeightKg: '', sourceMode: 'SCALE_AGENT', scaleTicketNo: '' })
  const [grossForm, setGrossForm] = useState({ lineId: '', rawWeightKg: '', sourceMode: 'SCALE_AGENT', scaleTicketNo: '' })

  const { data: response, isLoading, refetch } = useOutboundShipments({ ...filters, status: filters.status || undefined })
  const recordTare = useRecordOutboundTare()
  const recordGross = useRecordOutboundGross()
  const shipShipment = useShipOutboundShipment()

  const allRows = response?.data || []
  const rows = allRows.filter((r) => weighingStatuses.includes(r.status))
  const pagination = response?.pagination || { page: 1, totalPages: 1 }
  const selected = rows.find((r) => r.id === selectedId)

  const { data: weighingHistoryResponse } = useOutboundWeighingHistory(selected?.id)
  const weighingHistory = weighingHistoryResponse?.data || []

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
        <h2 className="section-title">Multi-trip weighing execution</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'All' }, { value: 'PICKED', label: 'PICKED (ready to weigh)' }, { value: 'WEIGHING_TARE', label: 'WEIGHING_TARE' }, { value: 'LOADING', label: 'LOADING' }, { value: 'ALL_WEIGHED', label: 'ALL_WEIGHED' }]} placeholder="Weighing status" className="max-w-xs" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Shipment</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead align="right">Tare / Gross / Net</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={5} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="No shipments in weighing queue" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id} onClick={() => openDetail(row.id)}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.shipmentNumber}</p>
                    <p className="text-xs text-navy-400">{row.lines?.length || 0} line(s)</p>
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
                    <Button variant="accent" size="sm" onClick={(e) => { e.stopPropagation(); shipShipment.mutate(row.id) }}>Ship</Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => openDetail(row.id)}>Detail</Button>
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
        title={`Shipment: ${selected?.shipmentNumber || ''}`}
        description="Weighing execution details and actions"
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-xl border border-moon-300 bg-moon-50/70 p-4 text-sm text-navy-700 grid grid-cols-2 gap-2">
              <p><strong>Status:</strong> {selected.status}</p>
              <p><strong>Tare:</strong> {selected.tareWeightKg || '—'} kg</p>
              <p><strong>Total Gross:</strong> {selected.totalGrossKg || '—'} kg</p>
              <p><strong>Total Net:</strong> {selected.totalNetKg || '—'} kg</p>
            </div>

            <div className="border-t border-moon-200 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Record Tare (empty vehicle)</h4>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Raw weight (kg)" type="number" value={tareForm.rawWeightKg} onChange={(e) => setTareForm((prev) => ({ ...prev, rawWeightKg: e.target.value }))} />
                <Select label="Source mode" value={tareForm.sourceMode} onChange={(e) => setTareForm((prev) => ({ ...prev, sourceMode: e.target.value }))} options={[{ value: 'SCALE_AGENT', label: 'SCALE_AGENT' }, { value: 'MANUAL', label: 'MANUAL' }]} />
                <Input label="Scale ticket No" value={tareForm.scaleTicketNo} onChange={(e) => setTareForm((prev) => ({ ...prev, scaleTicketNo: e.target.value }))} />
              </div>
              <Button variant="accent" size="sm" onClick={handleTare} disabled={selected.status !== 'PICKED' || recordTare.isPending}>Record Tare</Button>
            </div>

            <div className="border-t border-moon-200 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Record Gross (per line)</h4>
              <Select label="Line" value={grossForm.lineId} onChange={(e) => setGrossForm((prev) => ({ ...prev, lineId: e.target.value }))} options={(selected.lines || []).filter((l) => l.lineStatus !== 'LINE_SHIPPED').map((line) => ({ value: line.id, label: `Line ${line.lineNumber}: ${line.item?.code || line.itemId}` }))} placeholder="Select line" />
              <div className="grid grid-cols-3 gap-3">
                <Input label="Raw weight (kg)" type="number" value={grossForm.rawWeightKg} onChange={(e) => setGrossForm((prev) => ({ ...prev, rawWeightKg: e.target.value }))} />
                <Select label="Source mode" value={grossForm.sourceMode} onChange={(e) => setGrossForm((prev) => ({ ...prev, sourceMode: e.target.value }))} options={[{ value: 'SCALE_AGENT', label: 'SCALE_AGENT' }, { value: 'MANUAL', label: 'MANUAL' }]} />
                <Input label="Scale ticket No" value={grossForm.scaleTicketNo} onChange={(e) => setGrossForm((prev) => ({ ...prev, scaleTicketNo: e.target.value }))} />
              </div>
              <Button variant="accent" size="sm" onClick={handleGross} disabled={!selected.tareWeightKg || recordGross.isPending}>Record Gross</Button>
            </div>

            <div className="border-t border-moon-200 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Lines & Tolerance</h4>
              {selected.lines?.map((line) => (
                <div key={line.id} className="rounded-xl border border-moon-200 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-navy-800">Line {line.lineNumber}: {line.item?.code || line.itemId}</p>
                    <Badge variant={lineTone(line.lineStatus)}>{line.lineStatus}</Badge>
                  </div>
                  <p className="text-xs text-navy-500">Expected: {line.expectedQty?.toLocaleString()} kg · Tolerance: {line.tolerancePctApplied}%</p>
                  <p className="text-xs text-navy-500">Gross: {line.grossWeightKg || '—'} · Net: {line.netWeightKg || '—'} · Variance: {line.variancePct ?? '—'}%</p>
                </div>
              ))}
            </div>

            {weighingHistory.length > 0 && (
              <div className="border-t border-moon-200 pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-navy-900">Weighing History</h4>
                <div className="space-y-2 text-sm text-navy-700 max-h-40 overflow-y-auto">
                  {weighingHistory.map((item) => (
                    <div key={item.id} className="rounded-xl border border-moon-200 p-3">
                      <p className="font-semibold text-navy-800">{item.eventType} · {item.rawWeightKg} kg</p>
                      <p className="text-xs text-navy-400">{item.scaleTicketNo || item.sourceMode}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.status === 'ALL_WEIGHED' && (
              <div className="border-t border-moon-200 pt-4">
                <Button variant="accent" onClick={handleShip} disabled={shipShipment.isPending}>
                  {shipShipment.isPending ? 'Shipping...' : 'Ship Shipment'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
