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
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Quản lý ngoại lệ & vượt dung sai</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'OPEN', label: 'Đang mở' }, { value: 'RESOLVED', label: 'Đã xử lý' }]} placeholder="Trạng thái ngoại lệ" />
          <Select value={filters.severity} onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'high', label: 'Cao' }, { value: 'medium', label: 'Trung bình' }]} placeholder="Mức độ" />
          <Select value={filters.type} onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'TOLERANCE_FAIL', label: 'Vượt dung sai' }, { value: 'MANUAL_WEIGHT', label: 'Cân thủ công' }]} placeholder="Loại" />
          <Input placeholder="Tìm kiếm ngoại lệ..." disabled />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Ngoại lệ</TableHead>
              <TableHead>Phiếu nhập</TableHead>
              <TableHead>Ghi chú</TableHead>
              <TableHead align="center">Mức độ</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={5} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={5} message="Không có ngoại lệ nào" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold text-navy-900">{row.status === 'REJECTED' ? 'Vượt dung sai' : 'Đã hủy'}</p>
                    <p className="text-xs text-navy-400">{row.cancelReasonCode || row.manualEntryReasonCode || '—'} · lần {row.attemptNumber || 1}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-navy-800">{row.receiptNumber || row.id}</p>
                    <p className="text-xs text-navy-400">{row.status}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-navy-700">
                    {row.status === 'REJECTED' 
                      ? `Chênh lệch ${row.variancePct != null ? Number(row.variancePct).toFixed(2) : '—'}% (dung sai ${row.tolerancePctApplied != null ? Number(row.tolerancePctApplied).toFixed(2) : '—'}%)`
                      : row.cancelReasonCode || '—'}
                  </p>
                </TableCell>
                <TableCell align="center">
                  <Badge variant={row.status === 'REJECTED' ? 'danger' : 'default'}>
                    {row.status === 'REJECTED' ? 'Cao' : 'Thấp'}
                  </Badge>
                </TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={row.status !== 'REJECTED' || (row.attemptNumber || 1) >= 3}
                      onClick={() => reweighReceipt.mutate(row.id)}
                    >
                      Cân lại
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={row.status === 'CANCELLED'}
                      onClick={() => cancelReceipt.mutate({ id: row.id, data: { reasonCode: 'INBOUND_CANCELLED', note: 'Hủy từ màn hình ngoại lệ' } })}
                    >
                      Hủy
                    </Button>
                  </div>
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
