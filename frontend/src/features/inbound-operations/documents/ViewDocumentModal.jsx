import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, FileText, Truck, User, Calendar, Download, File, Check, AlertTriangle } from 'lucide-react'
import { Badge, Button, ConfirmModal } from '@shared/ui'
import { useInboundDocumentDetail, useConfirmInboundDocument, useReportErrorInboundDocument } from '@domains/inbound-operations'

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

function getFileUrl(doc) {
  if (!doc?.filePath) return null
  const normalized = doc.filePath.replace(/\\/g, '/')
  const idx = normalized.indexOf('uploads/')
  if (idx !== -1) return `/${normalized.slice(idx)}`
  if (normalized.startsWith('http')) return normalized
  return `/${normalized}`
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

export function ViewDocumentModal({ isOpen, onClose, document: docProp }) {
  const { data: docDetail } = useInboundDocumentDetail(docProp?.id)
  const confirmMutation = useConfirmInboundDocument()
  const reportErrorMutation = useReportErrorInboundDocument()
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null })

  const doc = docDetail || docProp

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('vi-VN')
  }

  const handleDownload = () => {
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

  const openConfirmModal = (type) => {
    setConfirmModal({ isOpen: true, type })
  }

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: null })
  }

  const handleConfirmAction = async (notes) => {
    try {
      if (confirmModal.type === 'confirm') {
        await confirmMutation.mutateAsync(doc.id)
      } else if (confirmModal.type === 'error') {
        await reportErrorMutation.mutateAsync({ id: doc.id, notes })
      }
      closeConfirmModal()
    } catch (error) {
      // Error handled by mutation
    }
  }

  if (!isOpen || !docProp) return null

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
                  <p className="text-sm text-navy-500">{doc.documentCode || doc.docCode || 'Chưa có mã'}</p>
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
                  <p className="font-medium text-navy-900">{doc.documentCode || doc.docCode || '—'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-navy-500">
                    <FileText className="h-4 w-4" />
                    <span>Số phiếu nhập</span>
                  </div>
                  <p className="font-medium text-navy-900">{doc.receiptHeader?.asnId || doc.receiptHeader?.receiptNumber || doc.receiptNumber || '—'}</p>
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
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="mr-1.5 h-4 w-4" /> Tải xuống
                  </Button>
                  {doc.status === 'DRAFT' && (
                    <>
                      <Button
                        variant="accent"
                        onClick={() => openConfirmModal('confirm')}
                        disabled={confirmMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="mr-1.5 h-4 w-4" /> Xác nhận
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => openConfirmModal('error')}
                        disabled={reportErrorMutation.isPending}
                        className="border-orange-500 text-orange-500 hover:bg-orange-50"
                      >
                        <AlertTriangle className="mr-1.5 h-4 w-4" /> Báo lỗi
                      </Button>
                    </>
                  )}
                </div>
                <Button variant="outline" onClick={onClose}>
                  Đóng
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={handleConfirmAction}
        title={confirmModal.type === 'confirm' ? 'Xác nhận chứng từ' : 'Báo lỗi chứng từ'}
        message={
          confirmModal.type === 'confirm'
            ? `Xác nhận chứng từ "${doc?.documentCode || doc?.fileName}" đã scan?`
            : `Báo lỗi chứng từ "${doc?.documentCode || doc?.fileName}"?`
        }
        confirmText={confirmModal.type === 'confirm' ? 'Xác nhận' : 'Báo lỗi'}
        type={confirmModal.type === 'confirm' ? 'confirm' : 'warning'}
        isLoading={confirmMutation.isPending || reportErrorMutation.isPending}
        showNotes={confirmModal.type === 'error'}
        notesLabel="Lý do báo lỗi"
        notesPlaceholder="Nhập lý do báo lỗi..."
        notesRequired={confirmModal.type === 'error'}
      />
    </AnimatePresence>,
    document.body
  )
}
