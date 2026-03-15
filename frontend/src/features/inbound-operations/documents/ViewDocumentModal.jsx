import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, FileText, Truck, User, Calendar, Download, File } from 'lucide-react'
import { Badge, Button } from '@shared/ui'

const STATUS_LABELS = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã nộp',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
}

const statusTone = (status) => {
  if (status === 'DRAFT') return 'default'
  if (status === 'SUBMITTED') return 'info'
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  return 'default'
}

const DOC_TYPE_LABELS = {
  BILL_OF_LADING: 'Vận đơn (B/L)',
  PACKING_LIST: 'Phiếu đóng gói',
  COMMERCIAL_INVOICE: 'Hóa đơn thương mại',
  CERTIFICATE_OF_ORIGIN: 'Giấy chứng nhận xuất xứ',
  QUALITY_CERTIFICATE: 'Chứng nhận chất lượng',
  WEIGHT_CERTIFICATE: 'Phiếu cân',
  OTHER: 'Khác',
}

export function ViewDocumentModal({ isOpen, onClose, document: doc }) {
  if (!isOpen || !doc) return null

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('vi-VN')
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-moon-200 bg-moon-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
                  <FileText className="h-5 w-5 text-navy-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">Chi tiết chứng từ</h2>
                  <p className="text-sm text-navy-500">{doc.docCode || doc.receiptNumber || 'Chưa có mã'}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-navy-400 hover:bg-moon-100 hover:text-navy-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-navy-500">Trạng thái:</span>
                <Badge variant={statusTone(doc.status)}>
                  {STATUS_LABELS[doc.status] || doc.status}
                </Badge>
              </div>

              {/* General Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <FileText className="h-4 w-4" />
                    <span>Mã chứng từ</span>
                  </div>
                  <p className="font-medium text-navy-900">{doc.docCode || doc.receiptNumber || '—'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <FileText className="h-4 w-4" />
                    <span>Số ASN</span>
                  </div>
                  <p className="font-medium text-navy-900">{doc.receiptNumber || doc.asnId || '—'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <Truck className="h-4 w-4" />
                    <span>Số xe</span>
                  </div>
                  <p className="font-medium text-navy-900">{doc.vehicleNumber || doc.vehiclePlate || '—'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <User className="h-4 w-4" />
                    <span>Chủ hàng</span>
                  </div>
                  <p className="font-medium text-navy-900">
                    {doc.owner?.ownerCode || doc.ownerId || '—'}
                    {doc.owner?.ownerName && (
                      <span className="text-navy-500 ml-1">— {doc.owner.ownerName}</span>
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <File className="h-4 w-4" />
                    <span>Loại chứng từ</span>
                  </div>
                  <p className="font-medium text-navy-900">
                    {DOC_TYPE_LABELS[doc.docType] || 'Phiếu nhập'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <Calendar className="h-4 w-4" />
                    <span>Ngày upload</span>
                  </div>
                  <p className="font-medium text-navy-900">{formatDate(doc.uploadedAt || doc.createdAt)}</p>
                </div>
              </div>

              {/* File Info */}
              <div className="rounded-lg border border-moon-200 p-4">
                <h3 className="text-sm font-semibold text-navy-800 mb-3 flex items-center gap-2">
                  <File className="h-4 w-4" />
                  Thông tin file
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-navy-500">Tên file:</span>
                    <span className="font-medium text-navy-900">{doc.fileName || doc.docName || '—'}</span>
                  </div>
                  {doc.fileSize && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-navy-500">Kích thước:</span>
                      <span className="font-medium text-navy-900">{(doc.fileSize / 1024).toFixed(2)} KB</span>
                    </div>
                  )}
                  {doc.fileType && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-navy-500">Định dạng:</span>
                      <span className="font-medium text-navy-900">{doc.fileType}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {doc.notes && (
                <div className="rounded-lg border border-moon-200 p-4">
                  <h3 className="text-sm font-semibold text-navy-800 mb-2">Ghi chú</h3>
                  <p className="text-sm text-navy-600">{doc.notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-moon-200 bg-moon-50 px-6 py-4">
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => {}}>
                  <Download className="mr-1.5 h-4 w-4" /> Tải xuống
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Đóng
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
