import { useState } from 'react'
import { useOutboundShipments, useAllocateOutboundShipment, useUnallocateOutboundShipment, useOutboundAllocations } from '@domains/outbound-operations'
import { Badge, Button, Modal, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'ALLOCATED') return 'success'
  if (status === 'CONFIRMED') return 'info'
  return 'default'
}

export function OutboundAllocationPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, status: '' })
  const [selectedId, setSelectedId] = useState(null)

  const { data: response, isLoading, refetch } = useOutboundShipments({
    ...filters,
    status: filters.status || undefined,
  })

  const allocateShipment = useAllocateOutboundShipment()
  const unallocateShipment = useUnallocateOutboundShipment()

  const allRows = response?.data || []
  const rows = allRows.filter((r) => ['CONFIRMED', 'ALLOCATED'].includes(r.status))
  const pagination = response?.pagination || { page: 1, totalPages: 1 }
  const selected = rows.find((r) => r.id === selectedId)

  const { data: allocationsResponse } = useOutboundAllocations(selected?.id)
  const allocations = allocationsResponse?.data || []

  const openDetail = (id) => setSelectedId(id)
  const closeDetail = () => setSelectedId(null)

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Allocation-based hold (FIFO)</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'All' }, { value: 'CONFIRMED', label: 'CONFIRMED (needs allocation)' }, { value: 'ALLOCATED', label: 'ALLOCATED' }]} placeholder="Filter by status" className="max-w-xs" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Shipment</TableHead>
              <TableHead>Owner / Vehicle</TableHead>
              <TableHead align="right">Expected Qty</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={5} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="No shipments need allocation" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id} onClick={() => openDetail(row.id)}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.shipmentNumber}</p>
                    <p className="text-xs text-navy-400">{row.lines?.length || 0} line(s)</p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.owner?.code || row.ownerId}</p>
                  <p className="text-xs text-navy-400">{row.vehicleNumber || 'N/A'}</p>
                </TableCell>
                <TableCell align="right" className="font-semibold text-navy-900">
                  {row.lines?.reduce((sum, l) => sum + (l.expectedQty || 0), 0).toLocaleString()} kg
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  {row.status === 'CONFIRMED' ? (
                    <Button variant="accent" size="sm" onClick={(e) => { e.stopPropagation(); allocateShipment.mutate(row.id) }} disabled={allocateShipment.isPending}>
                      Allocate
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); unallocateShipment.mutate(row.id) }} disabled={unallocateShipment.isPending}>
                      Release
                    </Button>
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
        description="Allocation details and shipment lines"
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-xl border border-moon-300 bg-moon-50/70 p-4 text-sm text-navy-700 grid grid-cols-2 gap-2">
              <p><strong>Status:</strong> {selected.status}</p>
              <p><strong>Owner:</strong> {selected.owner?.code || selected.ownerId}</p>
              <p><strong>Vehicle:</strong> {selected.vehicleNumber || 'N/A'}</p>
              <p><strong>Lines:</strong> {selected.lines?.length || 0}</p>
            </div>

            <div className="border-t border-moon-200 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Shipment Lines</h4>
              {selected.lines?.map((line) => (
                <div key={line.id} className="rounded-xl border border-moon-200 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-navy-800">Line {line.lineNumber}: {line.item?.code || line.itemId}</p>
                    <Badge variant={line.lineStatus === 'ALLOCATED' ? 'success' : 'default'}>{line.lineStatus}</Badge>
                  </div>
                  <p className="text-xs text-navy-500">Expected: {line.expectedQty?.toLocaleString()} kg · {line.cargoForm}</p>
                  <p className="text-xs text-navy-500">Allocated: {line.allocatedQty?.toLocaleString() || '—'} kg</p>
                </div>
              ))}
            </div>

            <div className="border-t border-moon-200 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-navy-900">Allocation Records</h4>
              {allocations.length === 0 ? (
                <p className="text-sm text-navy-400">No allocations yet</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allocations.map((alloc) => (
                    <div key={alloc.id} className="rounded-xl border border-moon-200 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-navy-800">Location: {alloc.locationId}</p>
                        <Badge variant={alloc.status === 'PICKED' ? 'success' : 'info'}>{alloc.status}</Badge>
                      </div>
                      <p className="text-xs text-navy-500">Qty: {alloc.allocatedQty?.toLocaleString()} kg · Lot date: {alloc.lotDate}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
