import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Upload, FileText, File, Trash2 } from 'lucide-react'
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
  const [dragActive, setDragActive] = useState(false)

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
    onClose()
  }

  const isValid = selectedFile && formData.docType

  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100">
                  <Upload className="h-5 w-5 text-accent-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">Tải lên chứng từ</h2>
                  <p className="text-sm text-navy-500">Tải lên chứng từ nhập kho</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-2 text-navy-400 hover:bg-moon-100 hover:text-navy-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6 space-y-5">
              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">
                  File chứng từ <span className="text-red-500">*</span>
                </label>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                    dragActive
                      ? 'border-accent-500 bg-accent-50'
                      : selectedFile
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-moon-300 hover:border-accent-400 hover:bg-moon-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />

                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <File className="h-8 w-8 text-emerald-600" />
                      <div className="text-left">
                        <p className="font-medium text-navy-900">{selectedFile.name}</p>
                        <p className="text-sm text-navy-500">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveFile() }}
                        className="ml-4 p-1.5 rounded-full text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-10 w-10 text-navy-400 mb-3" />
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

              {/* Document Type */}
              <div>
                <Select
                  label="Loại chứng từ"
                  required
                  value={formData.docType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, docType: e.target.value }))}
                  options={DOC_TYPES}
                />
              </div>

              {/* ASN Selection - Auto-fill other fields */}
              <div>
                <Select
                  label="Chọn ASN (Phiếu nhập)"
                  value={formData.receiptHeaderId}
                  onChange={handleAsnChange}
                  options={[
                    { value: '', label: 'Chọn ASN để tự động điền thông tin...' },
                    ...receipts.map((r) => ({
                      value: r.id,
                      label: `${r.asnId || r.receiptNumber || r.id?.slice(0, 8)}${r.vehicleNumber || r.vehiclePlate ? ` — ${r.vehicleNumber || r.vehiclePlate}` : ''}${r.owner?.ownerCode ? ` — ${r.owner.ownerCode}` : ''}`,
                    })),
                  ]}
                />
                {formData.receiptHeaderId && (
                  <p className="mt-1 text-xs text-emerald-600">✓ Đã tự động điền Chủ hàng và Số xe từ ASN</p>
                )}
              </div>

              {/* Owner */}
              <div>
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
              </div>

              {/* Vehicle Number */}
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Số xe</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-moon-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:bg-moon-100 disabled:text-navy-500"
                  placeholder="Nhập biển số xe..."
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, vehicleNumber: e.target.value }))}
                  disabled={!!formData.receiptHeaderId}
                />
              </div>

              {/* Notes */}
              <div>
                <Textarea
                  label="Ghi chú"
                  rows={3}
                  placeholder="Nhập ghi chú..."
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-moon-200 bg-moon-50 px-6 py-4">
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Hủy
                </Button>
                <Button
                  variant="accent"
                  onClick={handleSubmit}
                  disabled={!isValid || isLoading}
                >
                  {isLoading ? 'Đang tải...' : 'Tải lên'}
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
