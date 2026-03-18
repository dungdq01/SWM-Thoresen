import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, Camera, RefreshCw, ChevronRight, Clock, Truck, Package, FileText, Loader2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { useOcrResults } from '@domains/integration'
import { Pagination } from '@shared/ui'
import { OcrUploadModal } from './components/OcrUploadModal'
import { OcrStatusBadge } from './components/OcrReviewPanel'

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'REVIEW_REQUIRED', label: 'Cần xem xét' },
  { value: 'EXTRACTED', label: 'Đã trích xuất' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'UPLOADED', label: 'Đã tải lên' },
  { value: 'EXTRACTING', label: 'Đang xử lý' },
  { value: 'LINKED', label: 'Đã liên kết' },
  { value: 'REJECTED', label: 'Từ chối' },
]

function ConfidenceDot({ value }) {
  const num = Number(value) || 0
  if (num <= 0) return null
  const color = num >= 90 ? 'bg-emerald-400' : num >= 80 ? 'bg-sky-400' : num >= 70 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{num.toFixed(0)}%</span>
    </div>
  )
}

function OcrCard({ row, isSelected, onClick }) {
  const time = row.createdAt ? new Date(row.createdAt) : null
  const timeStr = time
    ? time.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
    : '—'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3.5 transition-all active:scale-[0.98] ${
        isSelected
          ? 'border-ice/40 bg-ice/5 ring-1 ring-ice/20'
          : 'border-transparent hover:border-ice/20'
      }`}
      style={{ backgroundColor: isSelected ? undefined : 'var(--color-bg-card)' }}
    >
      {/* Top: direction + status + confidence + time */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {row.direction === 'OUTBOUND' ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
              <ArrowUpFromLine className="h-3 w-3" />Xuất
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-200">
              <ArrowDownToLine className="h-3 w-3" />Nhập
            </span>
          )}
          <OcrStatusBadge status={row.status} />
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceDot value={row.overallConfidence} />
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
            <Clock className="inline h-3 w-3 mr-0.5 -mt-px" />{timeStr}
          </span>
        </div>
      </div>

      {/* Main info */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
            {row.ticketNumber || row.blNumber || 'Chưa có số phiếu'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {row.vehicleNumber && (
            <div className="flex items-center gap-1.5">
              <Truck className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{row.vehicleNumber}</span>
            </div>
          )}
          {row.productName && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Package className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{row.productName}</span>
            </div>
          )}
        </div>

        {row.qtyExtracted != null && (
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            TL hàng: <span style={{ color: 'var(--color-text)' }}>{row.qtyExtracted} {row.qtyUom || ''}</span>
          </p>
        )}
      </div>

      {/* Bottom: file name + arrow */}
      <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
        <p className="text-[10px] truncate max-w-[75%]" style={{ color: 'var(--color-text-muted)' }}>
          {row.originalFileName || row.ocrRequestId?.slice(0, 20) || row.id}
        </p>
        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    </button>
  )
}

export function OcrPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20, status: '', direction: '' })
  const [showUpload, setShowUpload] = useState(false)
  const navigate = useNavigate()

  const { data: response, isLoading, refetch } = useOcrResults(filters)
  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  const handleUploadSuccess = useCallback(() => {
    refetch()
  }, [refetch])

  const handleCardClick = useCallback((id) => {
    navigate(`/app/ocr/${id}`)
  }, [navigate])

  return (
    <div className="relative">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-ice" />
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>OCR Scanner</h2>
        </div>
        <button
          onClick={refetch}
          className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors active:scale-95"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}
        >
          <RefreshCw className="h-3.5 w-3.5" style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>

      {/* ── Direction filter ── */}
      <div className="flex gap-1.5 mb-2">
        {[
          { value: '', label: 'Tất cả' },
          { value: 'INBOUND', label: 'Nhập', icon: <ArrowDownToLine className="h-3 w-3" /> },
          { value: 'OUTBOUND', label: 'Xuất', icon: <ArrowUpFromLine className="h-3 w-3" /> },
        ].map((d) => (
          <button
            key={d.value}
            onClick={() => setFilters((prev) => ({ ...prev, direction: d.value, page: 1 }))}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filters.direction === d.value
                ? d.value === 'OUTBOUND'
                  ? 'bg-amber-500 text-white'
                  : d.value === 'INBOUND'
                  ? 'bg-sky-500 text-white'
                  : 'bg-ice text-navy-950'
                : 'text-moon-300 hover:text-ice'
            }`}
            style={filters.direction !== d.value ? { backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' } : undefined}
          >
            {d.icon}
            {d.label}
          </button>
        ))}
      </div>

      {/* ── Status filter chips — horizontal scroll ── */}
      <div className="-mx-3 px-3 mb-3 overflow-x-auto scrollbar-none">
        <div className="flex gap-1.5 pb-1" style={{ minWidth: 'max-content' }}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilters((prev) => ({ ...prev, status: s.value, page: 1 }))}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filters.status === s.value
                  ? 'bg-ice text-navy-950'
                  : 'text-moon-300 hover:text-ice'
              }`}
              style={filters.status !== s.value ? { backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' } : undefined}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Card list ── */}
      <div className="space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-ice" />
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl mb-3" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
              <ScanLine className="h-7 w-7" style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Chưa có kết quả OCR</p>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Bấm nút bên dưới để chụp ảnh và quét</p>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 rounded-xl bg-ice px-4 py-2.5 text-sm font-semibold text-navy-950 transition-colors active:scale-95"
            >
              <Camera className="h-4 w-4" />
              Chụp & Quét OCR
            </button>
          </div>
        )}

        {!isLoading && rows.map((row) => (
          <OcrCard
            key={row.id}
            row={row}
            isSelected={false}
            onClick={() => handleCardClick(row.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {!isLoading && rows.length > 0 && pagination.totalPages > 1 && (
        <div className="mt-3">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          />
        </div>
      )}

      {/* ── FAB: Chụp & Quét ── */}
      {rows.length > 0 && (
        <button
          onClick={() => setShowUpload(true)}
          className="fixed right-4 z-30 flex items-center gap-2 rounded-2xl bg-ice px-5 py-3.5 text-sm font-bold text-navy-950 shadow-lg shadow-ice/20 transition-all active:scale-95"
          style={{ bottom: 'calc(var(--bottom-nav-height, 0px) + env(safe-area-inset-bottom, 0px) + 16px)' }}
        >
          <Camera className="h-5 w-5" />
          Chụp & Quét
        </button>
      )}

      <OcrUploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  )
}
