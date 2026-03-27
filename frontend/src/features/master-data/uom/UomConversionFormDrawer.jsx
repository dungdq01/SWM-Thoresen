import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRightLeft, X } from 'lucide-react'
import { z } from 'zod'
import { Button, Input, Select } from '@shared/ui'

const createSchema = z.object({
  fromUomId: z.string().min(1, 'Vui lòng chọn UOM nguồn'),
  toUomId: z.string().min(1, 'Vui lòng chọn UOM đích'),
  conversionFactor: z
    .number({ invalid_type_error: 'Phải là số' })
    .positive('Hệ số phải lớn hơn 0'),
})

const editSchema = z.object({
  conversionFactor: z
    .number({ invalid_type_error: 'Phải là số' })
    .positive('Hệ số phải lớn hơn 0'),
})

export function UomConversionFormDrawer({ isOpen, onClose, onSubmit, initialData = null, isLoading = false, uomOptions = [] }) {
  const isEdit = !!initialData

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: { fromUomId: '', toUomId: '', conversionFactor: '' },
  })

  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      reset({ conversionFactor: initialData.conversionFactor ?? '' })
    } else {
      reset({ fromUomId: '', toUomId: '', conversionFactor: '' })
    }
  }, [initialData, isOpen, reset])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleFormSubmit = (data) => {
    if (isEdit) {
      onSubmit({ conversionFactor: data.conversionFactor, rowVersion: initialData.rowVersion })
    } else {
      onSubmit({ fromUomId: data.fromUomId, toUomId: data.toUomId, conversionFactor: data.conversionFactor })
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[100vw] sm:max-w-xl flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-ice-light">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    {isEdit ? 'Chỉnh sửa quy đổi' : 'Thêm quy đổi mới'}
                  </h2>
                  <p className="text-sm text-navy-400">Tỉ lệ chuyển đổi giữa hai đơn vị tính.</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
              {isEdit ? (
                /* Edit: show read-only route summary */
                <div className="rounded-xl border border-moon-200 bg-moon-50 px-4 py-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-navy-400">Quy đổi</p>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-white border border-moon-200 px-3 py-1.5 font-mono text-sm font-semibold text-navy-900">
                      {initialData.fromUom?.uomCode}
                    </span>
                    <ArrowRightLeft className="h-4 w-4 shrink-0 text-navy-400" />
                    <span className="rounded-lg bg-white border border-moon-200 px-3 py-1.5 font-mono text-sm font-semibold text-navy-900">
                      {initialData.toUom?.uomCode}
                    </span>
                  </div>
                  {(initialData.fromUom?.description || initialData.toUom?.description) && (
                    <p className="mt-1.5 text-xs text-navy-400">
                      {initialData.fromUom?.description} → {initialData.toUom?.description}
                    </p>
                  )}
                </div>
              ) : (
                /* Create: pick both UOMs */
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Từ UOM"
                    required
                    options={uomOptions}
                    placeholder="Chọn UOM..."
                    error={errors.fromUomId?.message}
                    {...register('fromUomId')}
                  />
                  <Select
                    label="Đến UOM"
                    required
                    options={uomOptions}
                    placeholder="Chọn UOM..."
                    error={errors.toUomId?.message}
                    {...register('toUomId')}
                  />
                </div>
              )}

              <Input
                label="Hệ số quy đổi"
                type="number"
                step="any"
                required
                placeholder="VD: 1000"
                hint={isEdit
                  ? `1 ${initialData.fromUom?.uomCode} = [hệ số] ${initialData.toUom?.uomCode}`
                  : 'Ví dụ: 1 MT = 1000 KG → nhập 1000'}
                error={errors.conversionFactor?.message}
                {...register('conversionFactor', { valueAsNumber: true })}
              />
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>Hủy</Button>
              <Button variant="accent" onClick={handleSubmit(handleFormSubmit)} isLoading={isLoading}>
                {isEdit ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
