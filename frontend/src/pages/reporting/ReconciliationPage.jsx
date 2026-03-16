import { useState } from 'react'
import { useReconResults } from '@domains/reporting'
import { Badge, Button, Pagination, SummaryDonut, ProgressRing, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'PASS', label: 'PASS' },
  { value: 'FAIL', label: 'FAIL' },
]

export function ReconciliationPage() {
  const [filters, setFilters] = useState({ resultStatus: '', page: 1, pageSize: 20 })
  const { data: response, refetch, isLoading } = useReconResults(filters)
  const rows = response?.data || []
  const pagination = response?.pagination || {}

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  const setPage = (page) => setFilters((prev) => ({ ...prev, page }))

  const formatTs = (ts) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' })
  }

  const formatDuration = (sec) => {
    if (!sec) return '—'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const passCount = rows.filter((r) => r.status === 'PASS').length
  const failCount = rows.filter((r) => r.status === 'FAIL').length
  const avgDuration = rows.length > 0 ? Math.round(rows.reduce((sum, r) => sum + r.durationSec, 0) / rows.length) : 0

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Đối soát — RECON-001</h2>
        <div className="flex items-center gap-2">
          <p className="text-xs text-navy-400">Hàng giờ · SLA ≤5 phút · Tồn kho = SUM(InventTrans)</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Làm mới</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <div className="wrs-card p-5">
          <h3 className="text-sm font-semibold text-navy-900 mb-3">Kết quả (trang hiện tại)</h3>
          <SummaryDonut
            centerLabel="Tổng"
            centerValue={passCount + failCount}
            data={[
              { name: 'PASS', value: passCount, color: '#059669' },
              { name: 'FAIL', value: failCount, color: '#e11d48' },
            ]}
          />
        </div>
        <div className="wrs-card p-5 flex items-center gap-6">
          <ProgressRing
            value={Math.min(avgDuration, 300)}
            max={300}
            size={100}
            color={avgDuration > 300 ? '#e11d48' : '#059669'}
            label="SLA ≤5m"
          />
          <div>
            <p className={`text-3xl font-bold ${avgDuration > 300 ? 'text-rose-600' : 'text-navy-900'}`}>{formatDuration(avgDuration)}</p>
            <p className="text-sm text-navy-500 mt-1">Thời gian TB</p>
            <p className="text-xs text-navy-400">Mục tiêu SLA: ≤ 5 phút</p>
          </div>
        </div>
      </div>

      {/* Quick status filter */}
      <div className="wrs-card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter('resultStatus', s.value)}
              className={[
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                filters.resultStatus === s.value
                  ? 'bg-ice text-navy-950 border-ice'
                  : 'bg-transparent text-navy-400 border-moon-200 hover:border-ice hover:text-ice',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="wrs-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã chạy</TableHead>
              <TableHead>Bắt đầu</TableHead>
              <TableHead>Hoàn thành</TableHead>
              <TableHead className="text-right">Thời gian</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Sai lệch</TableHead>
              <TableHead className="text-right">Chủ hàng</TableHead>
              <TableHead className="text-right">Vị trí</TableHead>
              <TableHead>Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading cols={9} />}
            {!isLoading && rows.length === 0 && <TableEmpty cols={9} message="Không có kết quả đối soát" />}
            {rows.map((row) => (
              <TableRow key={row.id} className={row.status === 'FAIL' ? 'bg-rose-50' : ''}>
                <TableCell className="font-mono text-xs text-navy-700">{row.runId}</TableCell>
                <TableCell className="text-xs text-navy-500">{formatTs(row.startedAt)}</TableCell>
                <TableCell className="text-xs text-navy-500">{formatTs(row.completedAt)}</TableCell>
                <TableCell className={`text-right text-sm font-semibold ${row.durationSec > 300 ? 'text-rose-600' : 'text-navy-900'}`}>
                  {formatDuration(row.durationSec)}
                </TableCell>
                <TableCell>
                  <Badge variant={row.status === 'PASS' ? 'success' : 'danger'}>{row.status}</Badge>
                </TableCell>
                <TableCell className={`text-right font-semibold ${row.discrepancies > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {row.discrepancies}
                </TableCell>
                <TableCell className="text-right text-navy-600">{row.ownersChecked}</TableCell>
                <TableCell className="text-right text-navy-600">{row.locationsChecked}</TableCell>
                <TableCell className="text-xs text-navy-500 max-w-xs">
                  {row.note || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pagination.total > 0 && (
          <div className="p-3 border-t border-moon-200">
            <Pagination
              page={filters.page}
              pageSize={filters.pageSize}
              total={pagination.total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </>
  )
}
