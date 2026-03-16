import { useState } from 'react'
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from '@domains/integration'
import { Badge, Button, Pagination, Select, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow, Textarea } from '@shared/ui'

const severityTone = (severity) => {
  if (severity === 'HIGH') return 'danger'
  if (severity === 'MEDIUM') return 'warning'
  return 'info'
}

const statusTone = (status) => {
  if (status === 'RESOLVED') return 'success'
  if (status === 'ACKNOWLEDGED') return 'warning'
  return 'danger'
}

export function AlertsPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', severity: '', alertSource: '' })
  const [resolutionNote, setResolutionNote] = useState('')
  const [resolvingId, setResolvingId] = useState('')

  const { data: response, isLoading, refetch } = useAlerts(filters)
  const acknowledgeAlert = useAcknowledgeAlert()
  const resolveAlert = useResolveAlert()

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleResolve = async (id) => {
    await resolveAlert.mutateAsync({ id, data: { resolutionNote } })
    setResolvingId('')
    setResolutionNote('')
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Cảnh báo tích hợp</h2>
        <Button variant="outline" size="sm" onClick={refetch}>Làm mới</Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Quick status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {[{ value: '', label: 'Tất cả' }, { value: 'OPEN', label: 'Mở' }, { value: 'ACKNOWLEDGED', label: 'Đã ghi nhận' }, { value: 'RESOLVED', label: 'Đã xử lý' }].map((s) => (
            <button
              key={s.value}
              onClick={() => setFilters((prev) => ({ ...prev, status: s.value, page: 1 }))}
              className={[
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                filters.status === s.value
                  ? 'bg-ice text-navy-950 border-ice'
                  : 'bg-transparent text-navy-400 border-moon-200 hover:border-ice hover:text-ice',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Select value={filters.severity} onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'HIGH', label: 'Cao' }, { value: 'MEDIUM', label: 'Trung bình' }, { value: 'LOW', label: 'Thấp' }]} placeholder="Mức độ" />
          <Select value={filters.alertSource} onChange={(e) => setFilters((prev) => ({ ...prev, alertSource: e.target.value, page: 1 }))} options={[{ value: '', label: 'Tất cả' }, { value: 'WEIGHBRIDGE', label: 'WEIGHBRIDGE' }, { value: 'ERP_SYNC', label: 'ERP_SYNC' }, { value: 'MOBILE_SYNC', label: 'MOBILE_SYNC' }, { value: 'OCR', label: 'OCR' }]} placeholder="Nguồn" />
        </div>

        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Cảnh báo</TableHead>
              <TableHead>Nguồn / Mức độ</TableHead>
              <TableHead>Nội dung</TableHead>
              <TableHead>Thời gian tạo</TableHead>
              <TableHead align="center">Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={6} /> : null}
            {!isLoading && rows.length === 0 ? <TableEmpty colSpan={6} message="Không có cảnh báo" /> : null}
            {!isLoading ? rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{row.title}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{row.alertSource}</p>
                  <Badge variant={severityTone(row.severity)} className="mt-1">{row.severity}</Badge>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-navy-700 max-w-xs truncate">{row.message}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-navy-400">{new Date(row.createdAt).toLocaleString('vi-VN')}</p>
                </TableCell>
                <TableCell align="center"><Badge variant={statusTone(row.status)}>{row.status}</Badge></TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-2">
                    {row.status === 'OPEN' && (
                      <Button variant="outline" size="sm" onClick={() => acknowledgeAlert.mutate({ id: row.id, data: {} })}>Ghi nhận</Button>
                    )}
                    {['OPEN', 'ACKNOWLEDGED'].includes(row.status) && (
                      <Button variant="accent" size="sm" onClick={() => setResolvingId(row.id)}>Xử lý</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
      </div>

      {resolvingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="wrs-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-navy-900">Xử lý cảnh báo</h3>
            <Textarea label="Ghi chú xử lý" rows={3} value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} placeholder="Nhập chi tiết xử lý..." />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setResolvingId('')}>Hủy</Button>
              <Button variant="accent" onClick={() => handleResolve(resolvingId)} disabled={resolveAlert.isPending}>Xử lý</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
