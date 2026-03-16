import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Layers, X, Sparkles } from 'lucide-react'
import { Button, Input, Select } from '@shared/ui'
import { ITEM_GROUP_CARGO_FORMS, useItemGroupNextCode } from '@domains/master-data'
import { itemGroupDefaultValues, itemGroupSchema } from './itemGroupForm.schema'

export function ItemGroupFormDrawer({ isOpen, onClose, onSubmit, initialData = null, isLoading = false }) {
  const isEdit = !!initialData
  const { data: nextCodeResponse } = useItemGroupNextCode(isOpen && !isEdit)
  const nextCode = nextCodeResponse?.data?.code || ''
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
    resolver: zodResolver(itemGroupSchema),
    defaultValues: itemGroupDefaultValues,
  })

  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      reset({
        itemGroupName: initialData.itemGroupName || '',
        description: initialData.description || '',
        cargoForm: initialData.cargoForm || 'BULK',
      })
    } else {
      reset(itemGroupDefaultValues)
    }
  }, [initialData, isOpen, reset])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleFormSubmit = (data) => {
    const payload = { ...data }
    if (isEdit && initialData) {
      payload.rowVersion = initialData.rowVersion
    } else {
      payload.itemGroupCode = nextCode
    }
    onSubmit(payload)
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-ice-light">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">{isEdit ? 'Chỉnh sửa nhóm hàng hóa' : 'Thêm nhóm hàng hóa'}</h2>
                  <p className="text-sm text-navy-400">{isEdit ? `Mã: ${initialData?.itemGroupCode}` : 'Điền thông tin bên dưới'}</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-700"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 space-y-5 overflow-y-auto p-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                  Mã nhóm {!isEdit && <span className="text-xs text-navy-400 font-normal">(Tự động)</span>}
                </label>
                {isEdit ? (
                  <Input value={initialData?.itemGroupCode || ''} disabled className="uppercase bg-navy-50" />
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-moon-300 bg-navy-50 px-3 py-2">
                    <Sparkles className="h-4 w-4 text-ice shrink-0" />
                    <span className="font-mono font-semibold text-navy-900">{nextCode || '...'}</span>
                  </div>
                )}
              </div>
              <Input
                label="Tên nhóm hàng hóa"
                required
                error={errors.itemGroupName?.message}
                {...register('itemGroupName')}
              />
              <Controller
                name="cargoForm"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Hình thức"
                    required
                    options={ITEM_GROUP_CARGO_FORMS}
                    error={errors.cargoForm?.message}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
              <Input
                label="Mô tả"
                error={errors.description?.message}
                {...register('description')}
              />
            </form>

            <div className="flex items-center justify-end gap-3 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>Hủy</Button>
              <Button variant="accent" onClick={handleSubmit(handleFormSubmit)} disabled={isLoading}>
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
