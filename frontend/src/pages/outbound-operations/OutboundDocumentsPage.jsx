import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Eye, Download, X, Image as ImageIcon, RefreshCw } from 'lucide-react'
import { useLookupOwners } from '@domains/master-data'
import {
  Badge,
  Button,
  Input,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from '@shared/ui'
import { useQuery } from '@tanstack/react-query'
import { httpClient } from '@shared/api'

const DOC_STATUSES = [
  { value: '', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Chờ scan' },
  { value: 'SCANNED', label: 'Đã scan' },
  { value: 'ERROR', label: 'Lỗi' },
]

const DOC_TYPES = [
  { value: '', label: 'Tất cả loại' },
  { value: 'BILL_OF_LADING', label: 'Vận đơn (B/L)' },
  { value: 'PACKING_LIST', label: 'Phiếu đóng gói' },
  { value: 'COMMERCIAL_INVOICE', label: 'Hóa đơn thương mại' },
  { value: 'DELIVERY_ORDER', label: 'Lệnh giao hàng' },
  { value: 'WEIGHT_CERTIFICATE', label: 'Phiếu cân' },
  { value: 'OTHER', label: 'Khác' },
]

const STATUS_LABELS = {
  DRAFT: 'Chờ scan',
  SCANNED: 'Đã scan',
  ERROR: 'Lỗi',
}

const statusTone = (status) => {
  if (status === 'DRAFT') return 'warning'
  if (status === 'SCANNED') return 'success'
  if (status === 'ERROR') return 'danger'
  return 'default'
}

const DOC_TYPE_LABELS = {
  BILL_OF_LADING: 'Vận đơn (B/L)',
  PACKING_LIST: 'Phiếu đóng gói',
  COMMERCIAL_INVOICE: 'Hóa đơn thương mại',
  DELIVERY_ORDER: 'Lệnh giao hàng',
  WEIGHT_CERTIFICATE: 'Phiếu cân',
  OTHER: 'Khác',
}

const IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

function getFileUrl(doc) {
  if (!doc.filePath) return null
  const normalized = doc.filePath.replace(/\\/g, '/')
  const idx = normalized.indexOf('uploads/')
  if (idx !== -1) return `/${normalized.slice(idx)}`
  if (normalized.startsWith('http')) return normalized
  return `/${normalized}`
}

function isImageFile(doc) {
  if (doc.mimeType && IMAGE_MIMES.includes(doc.mimeType)) return true
  const name = (doc.fileName || doc.filePath || '').toLowerCase()
  return /\.(jpg|jpeg|png|webp)$/.test(name)
}

function ImagePreviewModal({ isOpen, onClose, doc }) {
  if (!isOpen || !doc) return null

  const fileUrl = getFileUrl(doc)
  const fileName = doc.fileName || doc.documentName || 'Chứng từ'

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-navy-600 shadow-lg transition-colors hover:bg-moon-100"
            >
              <X className="h-4 w-4" />
            </button>

            {fileUrl && isImageFile(doc) ? (
              <img
                src={fileUrl}
                alt={fileName}
                className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
              />
            ) : (
              <div className="flex h-64 w-96 flex-col items-center justify-center rounded-xl bg-white shadow-2xl">
                <ImageIcon className="mb-3 h-12 w-12 text-navy-300" />
                <p className="text-sm text-navy-500">Không thể xem trước file này</p>
                {fileUrl && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700"
                  >
                    <Download className="h-4 w-4" />
                    Tải xuống
                  </a>
                )}
              </div>
            )}

            <p className="mt-3 text-center text-sm text-white/80">{fileName}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export function OutboundDocumentsPage() {
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, keyword: '', status: '', docType: '', ownerId: '' })
  const [previewDoc, setPreviewDoc] = useState(null)

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['outbound-documents', filters],
    queryFn: () => {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
      return httpClient.get('/outbound/documents', { params })
    },
    staleTime: 15000,
  })

  const { data: owners = [] } = useLookupOwners()

  const handleDownload = (doc) => {
    const fileUrl = getFileUrl(doc)
    if (!fileUrl) return
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = doc.fileName || 'document'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const rows = response?.data || []
  const pagination = response?.pagination || { page: 1, totalPages: 1 }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Chứng từ xuất</h2>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Làm mới
        </Button>
      </div>

      <div className="wrs-card p-5 space-y-4">
        {/* Quick status filter */}
        <div className="flex flex-wrap items-center gap-2">
          {DOC_STATUSES.map((s) => (
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

        {/* Other filters */}
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            placeholder="Tìm số B/L, số SO, tên chứng từ..."
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value, page: 1 }))}
          />
          <Select
            value={filters.docType}
            onChange={(e) => setFilters((prev) => ({ ...prev, docType: e.target.value, page: 1 }))}
            options={DOC_TYPES}
          />
          <Select
            value={filters.ownerId}
            onChange={(e) => setFilters((prev) => ({ ...prev, ownerId: e.target.value, page: 1 }))}
            options={[{ value: '', label: 'Chọn...' }, ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))]}
          />
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Mã CT</TableHead>
              <TableHead>Số phiếu xuất</TableHead>
              <TableHead>Số xe</TableHead>
              <TableHead>Chủ hàng</TableHead>
              <TableHead>Loại chứng từ</TableHead>
              <TableHead>Tên File</TableHead>
              <TableHead>Ngày upload</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead align="center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoading colSpan={9} />}
            {!isLoading && rows.length === 0 && <TableEmpty colSpan={9} message="Chưa có chứng từ xuất nào" />}
            {!isLoading && rows.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <p className="font-semibold text-navy-900">{doc.documentCode || doc.shipmentNumber || '—'}</p>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-navy-600">{doc.shipmentHeader?.shipmentNumber || '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-navy-700">{doc.vehiclePlate || doc.vehicleNumber || '—'}</span>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-navy-800">{doc.owner?.ownerCode || doc.ownerId}</p>
                  <p className="text-xs text-navy-400">{doc.owner?.ownerName}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="info">
                    {DOC_TYPE_LABELS[doc.docType] || 'Phiếu xuất'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="group flex items-center gap-1.5 text-left text-sm text-accent-600 hover:text-accent-700 hover:underline"
                    title="Bấm để xem ảnh"
                  >
                    {isImageFile(doc) && (
                      <ImageIcon className="h-3.5 w-3.5 shrink-0 text-accent-400 group-hover:text-accent-600" />
                    )}
                    <span className="truncate max-w-[160px]">{doc.fileName || doc.documentName || '—'}</span>
                  </button>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-navy-600">
                    {doc.uploadedAt || doc.createdAt ? new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={statusTone(doc.status)}>
                    {STATUS_LABELS[doc.status] || doc.status}
                  </Badge>
                </TableCell>
                <TableCell align="center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Xem"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Tải xuống"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        doc={previewDoc}
      />
    </>
  )
}
