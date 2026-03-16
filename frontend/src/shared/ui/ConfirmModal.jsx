import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Textarea } from './Textarea'
import { AlertTriangle, Check, Info, HelpCircle } from 'lucide-react'

const icons = {
  confirm: Check,
  warning: AlertTriangle,
  danger: AlertTriangle,
  info: Info,
  question: HelpCircle,
}

const iconColors = {
  confirm: 'text-green-600 bg-green-100',
  warning: 'text-orange-600 bg-orange-100',
  danger: 'text-red-600 bg-red-100',
  info: 'text-blue-600 bg-blue-100',
  question: 'text-navy-600 bg-navy-100',
}

const confirmButtonVariants = {
  confirm: 'accent',
  warning: 'accent',
  danger: 'danger',
  info: 'accent',
  question: 'accent',
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'confirm',
  isLoading = false,
  showNotes = false,
  notesLabel = 'Ghi chú',
  notesPlaceholder = 'Nhập ghi chú...',
  notesRequired = false,
}) {
  const [notes, setNotes] = useState('')
  const Icon = icons[type] || icons.confirm

  const handleConfirm = () => {
    if (showNotes && notesRequired && !notes.trim()) {
      return
    }
    onConfirm(showNotes ? notes : undefined)
    setNotes('')
  }

  const handleClose = () => {
    setNotes('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="sm"
      showClose={false}
      closeOnOverlay={!isLoading}
    >
      <div className="flex flex-col items-center text-center">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconColors[type]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-navy-900">{title}</h3>
        {message && (
          <p className="mt-2 text-sm text-navy-600">{message}</p>
        )}

        {showNotes && (
          <div className="mt-4 w-full text-left">
            <label className="block text-sm font-medium text-navy-700 mb-1.5">
              {notesLabel}
              {notesRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={notesPlaceholder}
              rows={3}
              className="w-full"
            />
          </div>
        )}

        <div className="mt-6 flex w-full gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmButtonVariants[type]}
            className={`flex-1 ${type === 'confirm' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={showNotes && notesRequired && !notes.trim()}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
