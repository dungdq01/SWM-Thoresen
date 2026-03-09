import { useState } from 'react'
import { useOutboundShipments, useAllocateOutboundShipment, useUnallocateOutboundShipment, useOutboundAllocations } from '@domains/outbound-operations'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const statusTone = (status) => {
  if (status === 'ALLOCATED') return 'success'
  if (status === 'CONFIRMED') return 'info'
  return 'default'
}

export function OutboundAllocationPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, status: '' })
  const [selectedId, setSelectedId] = useState('')

  const { data: response, isLoading, refetch } = useOutboundShipments({
    ...filters,
    status: filters.status || undefined,
  })

  const allocateShipment = useAllocateOutboundShipment()
  const unallocateShipment = useUnallocateOutboundShipment()

  const allRows = response?.data || []
  const rows = allRows.filter((r) => ['CONFIRMED', 'ALLOCATED'].includes(r.status))
  const pagination = response?.pagination || { page: 1, totalPages: 1 }
  const selected = rows.find((r) => r.id === selectedId) || rows[0]

  const { data: allocationsResponse } = useOutboundAllocations(selected?.id)
  const allocations = allocationsResponse?.data || []

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h2 className="section-title">Allocation-based hold (FIFO)</h2>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="wrs-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'CONFIRMED', label: 'CONFIRMED (needs allocation)' }, { value: 'ALLOCATED', label: 'ALLOCATED' }]} placeholder="Filter by status" className="max-w-xs" />
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
                <TableRow key={row.id} onClick={() => setSelectedId(row.id)} className={selected?.id === row.id ? 'bg-muted/60' : ''}>
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
                      <Button variant="accent" size="sm" onClick={() => allocateShipment.mutate(row.id)} disabled={allocateShipment.isPending}>
                        Allocate
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => unallocateShipment.mutate(row.id)} disabled={unallocateShipment.isPending}>
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

        <div className="space-y-5">
          <div className="wrs-card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-navy-900">Selected Shipment</h3>
              <p className="text-sm text-navy-400">{selected?.shipmentNumber || 'Select a shipment from the list'}</p>
            </div>
            {selected ? (
              <div className="rounded-xl border border-moon-300 bg-moon-50/70 p-4 text-sm text-navy-700 space-y-2">
                <p><strong>Status:</strong> {selected.status}</p>
                <p><strong>Owner:</strong> {selected.owner?.code || selected.ownerId}</p>
                <p><strong>Vehicle:</strong> {selected.vehicleNumber || 'N/A'}</p>
                <p><strong>Lines:</strong> {selected.lines?.length || 0}</p>
              </div>
            ) : null}
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Shipment Lines</h3>
            {selected?.lines?.map((line) => (
              <div key={line.id} className="rounded-xl border border-moon-200 p-3 space-y-1">
                <p className="font-semibold text-navy-800">Line {line.lineNumber}: {line.item?.code || line.itemId}</p>
                <p className="text-xs text-navy-500">Expected: {line.expectedQty?.toLocaleString()} kg · {line.cargoForm}</p>
                <p className="text-xs text-navy-500">Allocated: {line.allocatedQty?.toLocaleString() || '—'} kg</p>
                <Badge variant={line.lineStatus === 'ALLOCATED' ? 'success' : 'default'} className="mt-1">{line.lineStatus}</Badge>
              </div>
            ))}
          </div>

          <div className="wrs-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy-900">Allocation Records</h3>
            {allocations.length === 0 ? (
              <p className="text-sm text-navy-400">No allocations yet</p>
            ) : (
              allocations.map((alloc) => (
                <div key={alloc.id} className="rounded-xl border border-moon-200 p-3 space-y-1">
                  <p className="font-semibold text-navy-800">Location: {alloc.locationId}</p>
                  <p className="text-xs text-navy-500">Qty: {alloc.allocatedQty?.toLocaleString()} kg</p>
                  <p className="text-xs text-navy-500">Lot date: {alloc.lotDate}</p>
                  <Badge variant={alloc.status === 'PICKED' ? 'success' : 'info'}>{alloc.status}</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
