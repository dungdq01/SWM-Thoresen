import { useState, useCallback } from 'react'
import { ScanLine, Upload, RefreshCw } from 'lucide-react'
import { useOcrResults } from '@domains/integration'
import { Badge, Button, Select, Pagination, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableLoading, TableRow } from '@shared/ui'
import { OcrUploadModal } from './components/OcrUploadModal'
import { OcrReviewPanel, OcrStatusBadge } from './components/OcrReviewPanel'

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'UPLOADED', label: 'Đã tải lên' },
  { value: 'EXTRACTING', label: 'Đang trích xuất' },
  { value: 'EXTRACTED', label: 'Đã trích xuất' },
  { value: 'REVIEW_REQUIRED', label: 'Cần xem xét' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'LINKED', label: 'Đã liên kết' },
  { value: 'REJECTED', label: 'Từ chối' },
]

function ConfidenceMiniBar({ value }) {
  const num = Number(value) || 0
  if (num <= 0) return <span className="text-xs text-muted-foreground">—</span>
  const pct = Math.min(100, Math.max(0, num))
  const color = pct >= 90 ? 'bg-success' : pct >= 80 ? 'bg-info' : pct >= 70 ? 'bg-warning' : 'bg-danger'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-foreground">{pct.toFixed(1)}%</span>
    </div>
  )
}

export function OcrPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '' })
  const [showUpload, setShowUpload] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const { data: response, isLoading, refetch } = useOcrResults(filters)
  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleUploadSuccess = useCallback(() => {
    refetch()
  }, [refetch])

  const handleRowClick = useCallback((id) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }, [])

  const handleActionComplete = useCallback(() => {
    setSelectedId(null)
    refetch()
  }, [refetch])

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-ice" />
          <h2 className="section-title">OCR Scanner</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Làm mới
          </Button>
          <Button variant="accent" size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />Upload ảnh
          </Button>
        </div>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
            options={STATUS_OPTIONS}
            placeholder="Trạng thái"
          />
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã OCR</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Số phiếu</TableHead>
              <TableHead>Biển số xe</TableHead>
              <TableHead>Hàng hóa</TableHead>
              <TableHead>Trọng lượng hàng</TableHead>
              <TableHead align="center">Độ tin cậy</TableHead>
              <TableHead>Thời gian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableLoading colSpan={8} /> : null}
            {!isLoading && rows.length === 0 ? (
              <TableEmpty colSpan={8} message="Chưa có kết quả OCR nào. Bấm 'Upload ảnh' để bắt đầu quét." />
            ) : null}
            {!isLoading ? rows.map((row) => (
              <TableRow
                key={row.id}
                className={`cursor-pointer ${selectedId === row.id ? 'bg-ice/5 ring-1 ring-ice/20' : ''}`}
                onClick={() => handleRowClick(row.id)}
              >
                <TableCell>
                  <p className="font-mono text-xs text-foreground">{row.ocrRequestId?.slice(0, 20) || row.id}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[140px]">{row.originalFileName}</p>
                </TableCell>
                <TableCell>
                  <OcrStatusBadge status={row.status} />
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{row.blNumber || '—'}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-foreground">{row.vehicleNumber || '—'}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-foreground truncate max-w-[160px]">{row.productName || '—'}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-foreground">{row.qtyExtracted != null ? `${row.qtyExtracted} ${row.qtyUom || ''}`.trim() : '—'}</p>
                </TableCell>
                <TableCell align="center">
                  <ConfidenceMiniBar value={row.overallConfidence} />
                </TableCell>
                <TableCell>
                  <p className="text-xs text-muted-foreground">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString('vi-VN') : '—'}
                  </p>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      </div>

      {/* Review Panel */}
      {selectedId && (
        <div className="wrs-card p-5 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Chi tiết kết quả OCR</h3>
            <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>Đóng</Button>
          </div>
          <OcrReviewPanel
            resultId={selectedId}
            onClose={() => setSelectedId(null)}
            onActionComplete={handleActionComplete}
          />
        </div>
      )}

      <OcrUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </>
  )
}
