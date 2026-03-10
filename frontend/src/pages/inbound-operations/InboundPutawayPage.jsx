import { useMemo, useState } from 'react'
import { ArrowRightLeft, CheckCheck, PackageCheck, Waypoints } from 'lucide-react'
import { useCompleteInboundPutaway, useInboundPutawayQueue } from '@domains/inbound-operations'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const putawayTone = (status) => {
  if (status === 'CLOSED') return 'success'
  if (status === 'PUTAWAY') return 'warning'
  return 'info'
}

export function InboundPutawayPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, status: '' })
  const { data: response, isLoading, refetch } = useInboundPutawayQueue({ ...filters, status: filters.status || undefined })
  const completePutaway = useCompleteInboundPutaway()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Putaway handoff & receipt closing</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'RECEIVED', label: 'RECEIVED' }, { value: 'PUTAWAY', label: 'PUTAWAY' }]} placeholder="Queue status" className="max-w-xs" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Receipt</TableHead>
              <TableHead>Owner / Item</TableHead>
              <TableHead>Integration</TableHead>
              <TableHead align="center">Status</TableHead>
              <TableHead align="center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={5} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="No receipts in putaway queue" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.receiptNumber}</p>
                    <p className="text-xs text-navy-400">{row.putawayWorkId || 'No work ID'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.owner?.ownerCode || row.ownerId}</p>
                  <p className="text-xs text-navy-400">{row.item?.itemCode || row.itemId}</p>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-navy-500">
                    <p>M3: {row.integrationStatus?.inventoryPosting || 'N/A'}</p>
                    <p>M7: {row.integrationStatus?.putaway || 'N/A'}</p>
                    <p>M10: {row.integrationStatus?.billing || 'N/A'}</p>
                  </div>
                </TableCell>
                <TableCell align="center"><Badge variant={putawayTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <Button variant="accent" size="sm" onClick={() => completePutaway.mutate(row.id)}>
                    {row.status === 'RECEIVED' ? 'Create Handoff' : 'Close Receipt'}
                  </Button>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>
    </>
  )
}
