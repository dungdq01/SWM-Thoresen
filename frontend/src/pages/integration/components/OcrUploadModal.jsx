import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileImage, Loader2, Camera, ImagePlus } from 'lucide-react'
import { Button, Modal } from '@shared/ui'
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
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const uploadMutation = useUploadOcrImage()
  const camera = useCamera()

  const resetState = useCallback(() => {
    setFile(null)
    setPreview(null)
    setError('')
    setDragActive(false)
    camera.reset()
  }, [camera])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  const validateFile = useCallback((f) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError(`Định dạng không hỗ trợ. Chấp nhận: JPG, PNG, PDF`)
      return false
    }
    if (f.size > MAX_SIZE_BYTES) {
      setError(`Kích thước vượt quá ${MAX_SIZE_MB}MB. File hiện tại: ${formatFileSize(f.size)}`)
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

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragActive(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

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
      title="Tải ảnh lên để quét OCR"
      description="Hỗ trợ file JPG, PNG, PDF — tối đa 10MB"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Hủy</Button>
          <Button
            variant="accent"
            onClick={handleUpload}
            disabled={!file || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Đang tải lên...</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />Tải lên & Quét</>
            )}
          </Button>
        </>
      }
    >
      {!file ? (
        <div className="space-y-3">
          {/* Camera + Gallery buttons */}
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const result = await camera.takePhoto()
                if (result?.file) handleFileSelect(result.file)
              }}
              disabled={camera.loading}
              className="flex-1 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ice/40 bg-ice/5 p-4 transition-colors hover:border-ice hover:bg-ice/10"
            >
              <Camera className="h-6 w-6 text-ice" />
              <span className="text-xs font-medium text-ice">{camera.loading ? 'Đang mở...' : 'Chụp ảnh'}</span>
            </button>
            <button
              onClick={async () => {
                const result = await camera.pickFromGallery()
                if (result?.file) handleFileSelect(result.file)
              }}
              disabled={camera.loading}
              className="flex-1 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-4 transition-colors hover:border-ice/50 hover:bg-muted/30"
            >
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Thư viện</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground">hoặc</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* Drag & drop area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors
              ${dragActive ? 'border-ice bg-ice/5' : 'border-border hover:border-ice/50 hover:bg-muted/30'}
            `}
          >
            <FileImage className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Kéo thả hoặc chọn file</p>
              <p className="mt-0.5 text-xs text-muted-foreground">JPG, PNG, PDF — tối đa {MAX_SIZE_MB}MB</p>
            </div>
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
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-4 rounded-lg border border-border bg-muted/20 p-4">
            {preview ? (
              <img src={preview} alt="Preview" className="h-20 w-20 rounded-md object-cover border border-border" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-md bg-muted border border-border">
                <FileImage className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatFileSize(file.size)}</p>
              <p className="text-xs text-muted-foreground">{file.type}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); resetState() }}
              className="p-1 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md bg-danger/10 border border-danger/20 px-3 py-2">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
    </Modal>
  )
}
