import { useMemo, useState } from 'react'
import { AlertTriangle, Ban, RotateCcw, ShieldAlert } from 'lucide-react'
import { useCancelInboundReceipt, useInboundExceptions, useReweighInboundReceipt } from '@domains/inbound-operations'
import { Badge, Button, Input, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const severityTone = (severity) => {
  if (severity === 'high') return 'danger'
  if (severity === 'medium') return 'warning'
  return 'default'
}

export function InboundExceptionsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, status: '', severity: '', type: '' })
  const { data: response, isLoading, refetch } = useInboundExceptions({
    ...filters,
    status: filters.status || undefined,
    severity: filters.severity || undefined,
    type: filters.type || undefined,
  })
  const reweighReceipt = useReweighInboundReceipt()
  const cancelReceipt = useCancelInboundReceipt()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <h2 className="section-title">Tolerance fail & exception governance</h2>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới dữ liệu</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: 'OPEN', label: 'OPEN' }, { value: 'RESOLVED', label: 'RESOLVED' }]} placeholder="Exception status" />
          <Select value={filters.severity} onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value, page: 1 }))} options={[{ value: 'high', label: 'high' }, { value: 'medium', label: 'medium' }]} placeholder="Severity" />
          <Select value={filters.type} onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value, page: 1 }))} options={[{ value: 'TOLERANCE_FAIL', label: 'TOLERANCE_FAIL' }, { value: 'MANUAL_WEIGHT', label: 'MANUAL_WEIGHT' }]} placeholder="Type" />
          <Input placeholder="Rule-based exception review" disabled />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Exception</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead>Note</TableHead>
              <TableHead align="center">Severity</TableHead>
              <TableHead align="center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={5} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="Không có exception phù hợp" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.type}</p>
                    <p className="text-xs text-navy-400">{row.reasonCode} · attempt {row.attemptNumber}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-800">{row.receipt?.receiptNumber || row.receiptId}</p>
                    <p className="text-xs text-navy-400">{row.receipt?.status || 'N/A'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-navy-700">{row.note}</p>
                </TableCell>
                <TableCell align="center"><Badge variant={severityTone(row.severity)}>{row.severity}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!row.receipt || row.receipt.status !== 'REJECTED' || row.receipt.attemptNumber >= 3}
                      onClick={() => reweighReceipt.mutate(row.receipt.id)}
                    >
                      Re-weigh
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!row.receipt || !['REJECTED', 'AWAITING_WEIGHING', 'WEIGHED_IN', 'PROCESSING', 'DRAFT'].includes(row.receipt.status)}
                      onClick={() => cancelReceipt.mutate({ id: row.receipt.id, data: { reasonCode: 'INBOUND_CANCELLED', note: 'Cancelled from exception console' } })}
                    >
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>
    </div>
  )
}
