import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal, Button, Textarea } from '@shared/ui'

export function DeactivateModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận ngừng hoạt động',
  entityName = 'mục này',
  isLoading = false,
}) {
  const [reason, setReason] = useState('')

  const handleConfirm = () => {
    onConfirm(reason)
    setReason('')
  }

  const handleClose = () => {
    setReason('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Hủy bỏ
          </Button>
          <Button variant="danger" onClick={handleConfirm} isLoading={isLoading}>
            Xác nhận ngừng
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Lưu ý</p>
            <p className="mt-1">
              Sau khi ngừng hoạt động, <strong>{entityName}</strong> sẽ không thể được sử dụng trong các chứng từ mới.
              Bạn có thể kích hoạt lại bất cứ lúc nào.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            Lý do ngừng hoạt động
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do (không bắt buộc)..."
            rows={3}
          />
        </div>
      </div>
    </Modal>
  )
}

export function ReactivateModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận kích hoạt lại',
  entityName = 'mục này',
  isLoading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Hủy bỏ
          </Button>
          <Button onClick={onConfirm} isLoading={isLoading}>
            Xác nhận kích hoạt
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-sm text-green-800">
          <p className="font-medium">Kích hoạt lại</p>
          <p className="mt-1">
            <strong>{entityName}</strong> sẽ được kích hoạt lại và có thể sử dụng trong các chứng từ mới.
          </p>
        </div>
      </div>
    </Modal>
  )
}
