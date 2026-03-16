import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Upload, FileText, Trash2, Image, Eye } from 'lucide-react'
import { Button, Select, Textarea } from '@shared/ui'

const DOC_TYPES = [
  { value: '', label: 'Chọn loại chứng từ' },
  { value: 'BILL_OF_LADING', label: 'Vận đơn (B/L)' },
  { value: 'PACKING_LIST', label: 'Phiếu đóng gói' },
  { value: 'COMMERCIAL_INVOICE', label: 'Hóa đơn thương mại' },
  { value: 'CERTIFICATE_OF_ORIGIN', label: 'Giấy chứng nhận xuất xứ' },
  { value: 'QUALITY_CERTIFICATE', label: 'Chứng nhận chất lượng' },
  { value: 'WEIGHT_CERTIFICATE', label: 'Phiếu cân' },
  { value: 'OTHER', label: 'Khác' },
]

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

function isImageFile(file) {
  return file && IMAGE_TYPES.includes(file.type)
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadDocumentModal({ isOpen, onClose, onSubmit, isLoading = false, owners = [], receipts = [] }) {
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    docType: '',
    receiptHeaderId: '',
    ownerId: '',
    vehicleNumber: '',
    notes: '',
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  // Generate preview URL for image files
  useEffect(() => {
    if (selectedFile && isImageFile(selectedFile)) {
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
    }
  }, [selectedFile])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Auto-fill fields when ASN is selected
  const handleAsnChange = (e) => {
    const receiptId = e.target.value
    setFormData((prev) => ({ ...prev, receiptHeaderId: receiptId }))

    if (receiptId) {
      const selectedReceipt = receipts.find((r) => r.id === receiptId)
      if (selectedReceipt) {
        setFormData((prev) => ({
          ...prev,
          receiptHeaderId: receiptId,
          ownerId: selectedReceipt.ownerId || '',
          vehicleNumber: selectedReceipt.vehicleNumber || selectedReceipt.vehiclePlate || '',
        }))
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        receiptHeaderId: '',
        ownerId: '',
        vehicleNumber: '',
      }))
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = () => {
    if (!selectedFile || !formData.docType) return

    const payload = {
      ...formData,
      file: selectedFile,
    }
    onSubmit?.(payload)
  }

  const handleClose = () => {
    setFormData({
      docType: '',
      receiptHeaderId: '',
      ownerId: '',
      vehicleNumber: '',
      notes: '',
    })
    setSelectedFile(null)
    setPreviewUrl(null)
    setShowPreviewModal(false)
    onClose()
  }

  const isValid = selectedFile && formData.docType

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-ice-light">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">Tải lên chứng từ</h2>
                  <p className="text-sm text-navy-400">Tải lên chứng từ nhập kho</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-moon-100">

              {/* Section 1: File chứng từ */}
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">1</span>
                  <h3 className="text-sm font-semibold text-navy-800">File chứng từ</h3>
                </div>

                {/* Upload area */}
                <div
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                    dragActive
                      ? 'border-accent-500 bg-accent-50'
                      : selectedFile
                      ? 'border-emerald-400 bg-emerald-50/50'
                      : 'border-moon-300 hover:border-accent-400 hover:bg-moon-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => !selectedFile && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />

                  {selectedFile ? (
                    <div className="space-y-4">
                      {/* Image preview */}
                      {previewUrl ? (
                        <div className="flex justify-center">
                          <div className="relative group">
                            <img
                              src={previewUrl}
                              alt={selectedFile.name}
                              className="max-h-48 rounded-lg border border-moon-200 object-contain shadow-sm"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowPreviewModal(true)
                              }}
                              className="absolute inset-0 flex items-center justify-center rounded-lg bg-navy-900/0 opacity-0 transition-all group-hover:bg-navy-900/40 group-hover:opacity-100"
                            >
                              <div className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-navy-700 shadow">
                                <Eye className="h-4 w-4" />
                                Xem lớn
                              </div>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-100">
                            <FileText className="h-8 w-8 text-emerald-600" />
                          </div>
                        </div>
                      )}

                      {/* File info */}
                      <div className="flex items-center justify-center gap-3">
                        <div className="text-center">
                          <p className="font-medium text-navy-900">{selectedFile.name}</p>
                          <p className="text-sm text-navy-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            fileInputRef.current?.click()
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-moon-300 bg-white px-3 py-1.5 text-sm font-medium text-navy-600 transition-colors hover:bg-moon-50"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Đổi file
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveFile()
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xóa
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-center mb-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-moon-100">
                          <Upload className="h-7 w-7 text-navy-400" />
                        </div>
                      </div>
                      <p className="text-sm text-navy-600 mb-1">
                        Kéo thả file vào đây hoặc <span className="text-accent-600 font-medium">chọn file</span>
                      </p>
                      <p className="text-xs text-navy-400">
                        Hỗ trợ: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (tối đa 10MB)
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Section 2: Thông tin chứng từ */}
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-800 text-[10px] font-bold text-white">2</span>
                  <h3 className="text-sm font-semibold text-navy-800">Thông tin chứng từ</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Loại chứng từ *"
                    value={formData.docType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, docType: e.target.value }))}
                    options={DOC_TYPES}
                  />
                  <Select
                    label="Chọn ASN (Phiếu nhập)"
                    value={formData.receiptHeaderId}
                    onChange={handleAsnChange}
                    options={[
                      { value: '', label: 'Chọn ASN...' },
                      ...receipts.map((r) => ({
                        value: r.id,
                        label: `${r.asnId || r.receiptNumber || r.id?.slice(0, 8)}${r.vehicleNumber || r.vehiclePlate ? ` — ${r.vehicleNumber || r.vehiclePlate}` : ''}${r.owner?.ownerCode ? ` — ${r.owner.ownerCode}` : ''}`,
                      })),
                    ]}
                  />
                </div>
                {formData.receiptHeaderId && (
                  <p className="text-xs text-emerald-600 -mt-2">✓ Đã tự động điền Chủ hàng và Số xe từ ASN</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Chủ hàng"
                    value={formData.ownerId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, ownerId: e.target.value }))}
                    disabled={!!formData.receiptHeaderId}
                    options={[
                      { value: '', label: 'Chọn chủ hàng' },
                      ...owners.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` })),
                    ]}
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-navy-700">Số xe</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-moon-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:bg-moon-100 disabled:text-navy-500"
                      placeholder="Nhập biển số xe..."
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData((prev) => ({ ...prev, vehicleNumber: e.target.value }))}
                      disabled={!!formData.receiptHeaderId}
                    />
                  </div>
                </div>

                <Textarea
                  label="Ghi chú"
                  rows={2}
                  placeholder="Nhập ghi chú..."
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>

            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-navy-400">
                  {isValid
                    ? <span className="text-emerald-600 font-medium">✓ Sẵn sàng tải lên</span>
                    : '* File chứng từ và loại chứng từ là bắt buộc'}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                    Hủy
                  </Button>
                  <Button
                    variant="accent"
                    onClick={handleSubmit}
                    isLoading={isLoading}
                    disabled={!isValid}
                  >
                    {isLoading ? 'Đang tải...' : 'Tải lên'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Image Preview Modal */}
          <AnimatePresence>
            {showPreviewModal && previewUrl && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/80 backdrop-blur-md"
                onClick={() => setShowPreviewModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="relative max-h-[90vh] max-w-[90vw]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-navy-600 shadow-lg transition-colors hover:bg-moon-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <img
                    src={previewUrl}
                    alt={selectedFile?.name}
                    className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
                  />
                  <p className="mt-3 text-center text-sm text-white/80">
                    {selectedFile?.name} — {formatFileSize(selectedFile?.size || 0)}
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
