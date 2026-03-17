import { useState, useRef, useCallback } from 'react'
import { Camera, ImagePlus, Upload, X, FileImage, Loader2 } from 'lucide-react'
import { Modal } from '@shared/ui'
import { useUploadOcrImage } from '@domains/integration'
import { useCamera } from '@shared/hooks/useCamera'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE_MB = 10
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function OcrUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const uploadMutation = useUploadOcrImage()
  const { takePhoto, pickFromGallery } = useCamera()

  const resetState = useCallback(() => {
    setFile(null)
    setPreview(null)
    setError('')
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  const validateFile = useCallback((f) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Định dạng không hỗ trợ. Chấp nhận: JPG, PNG, PDF')
      return false
    }
    if (f.size > MAX_SIZE_BYTES) {
      setError(`Vượt quá ${MAX_SIZE_MB}MB. File: ${formatFileSize(f.size)}`)
      return false
    }
    setError('')
    return true
  }, [])

  const handleFileSelect = useCallback((f) => {
    if (!validateFile(f)) return
    setFile(f)
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }, [validateFile])

  const handleCameraCapture = useCallback(async () => {
    const result = await takePhoto()
    if (result?.file) {
      setFile(result.file)
      setPreview(result.dataUrl)
      setError('')
    }
  }, [takePhoto])

  const handleGalleryPick = useCallback(async () => {
    const result = await pickFromGallery()
    if (result?.file) {
      setFile(result.file)
      setPreview(result.dataUrl)
      setError('')
    }
  }, [pickFromGallery])

  const handleUpload = async () => {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      await uploadMutation.mutateAsync(formData)
      handleClose()
      onUploadSuccess?.()
    } catch {
      // Error handled by mutation hook toast
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Chụp ảnh hoặc chọn file"
      size="md"
    >
      <div className="space-y-4">
        {!file ? (
          <>
            {/* Camera buttons — primary actions for mobile */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCameraCapture}
                className="flex flex-col items-center gap-2 rounded-xl py-5 transition-all active:scale-[0.97]"
                style={{ backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ice/15">
                  <Camera className="h-5 w-5 text-ice" />
                </div>
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Chụp ảnh</span>
              </button>

              <button
                onClick={handleGalleryPick}
                className="flex flex-col items-center gap-2 rounded-xl py-5 transition-all active:scale-[0.97]"
                style={{ backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ice/15">
                  <ImagePlus className="h-5 w-5 text-ice" />
                </div>
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Thư viện</span>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
              <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>HOẶC CHỌN FILE</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>

            {/* File picker — secondary */}
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 transition-all active:scale-[0.98]"
              style={{ backgroundColor: 'var(--color-bg-card)', border: '1px dashed var(--color-border)' }}
            >
              <FileImage className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              <div className="text-left">
                <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>Chọn file từ thiết bị</p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>JPG, PNG, PDF — tối đa {MAX_SIZE_MB}MB</p>
              </div>
            </button>

            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileSelect(f)
              }}
            />
          </>
        ) : (
          /* File selected — preview + upload */
          <div className="space-y-4">
            {/* Preview */}
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
              {preview ? (
                <img src={preview} alt="Preview" className="w-full object-contain" style={{ maxHeight: '240px', backgroundColor: 'var(--color-bg-subtle)' }} />
              ) : (
                <div className="flex items-center justify-center py-10" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
                  <FileImage className="h-10 w-10" style={{ color: 'var(--color-text-muted)' }} />
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-2" style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{file.name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={resetState}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors active:scale-95"
                  style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Upload button — full width */}
            <button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-ice py-3 text-sm font-bold text-navy-950 transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {uploadMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Đang tải lên...</>
              ) : (
                <><Upload className="h-4 w-4" />Tải lên & Quét OCR</>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl px-3 py-2" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-xs font-medium" style={{ color: '#f87171' }}>{error}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
