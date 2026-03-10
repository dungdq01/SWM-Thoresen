import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Ruler, X } from 'lucide-react'
import { Button, Input, Select, Switch } from '@shared/ui'
import { UOM_CLASSES } from '@domains/master-data'
import { uomDefaultValues, uomSchema } from './uomForm.schema'

export function UomFormDrawer({ isOpen, onClose, onSubmit, initialData = null, isLoading = false }) {
  const isEdit = !!initialData

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(uomSchema),
    defaultValues: uomDefaultValues,
  })

  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      reset({
        uomCode: initialData.uomCode || '',
        description: initialData.description || '',
        uomClass: initialData.uomClass || 'WEIGHT',
        isBaseUom: initialData.isBaseUom || false,
        decimalPrecision: initialData.decimalPrecision ?? 3,
      })
    } else {
      reset(uomDefaultValues)
    }
  }, [initialData, isOpen, reset])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleFormSubmit = (data) => {
    let payload
    if (isEdit && initialData) {
      // UpdateUomDto chỉ cho phép: description, decimalPrecision, rowVersion
      payload = {
        description: data.description,
        decimalPrecision: data.decimalPrecision,
        rowVersion: initialData.rowVersion,
      }
    } else {
      payload = { ...data }
    }
    onSubmit(payload)
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-ice-light">
                  <Ruler className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">{isEdit ? 'Chỉnh sửa đơn vị tính' : 'Thêm đơn vị tính mới'}</h2>
                  <p className="text-sm text-navy-400">Quản lý baseline UOM cho inventory, inbound và billing.</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Mã UOM" required disabled={isEdit} error={errors.uomCode?.message} className="uppercase" placeholder="VD: KG" {...register('uomCode')} />
                <Controller
                  name="decimalPrecision"
                  control={control}
                  render={({ field }) => (
                    <Input label="Độ chính xác" required type="number" value={field.value ?? ''} onChange={(e) => field.onChange(Number(e.target.value))} error={errors.decimalPrecision?.message} />
                  )}
                />
              </div>

              <Input label="Mô tả" required placeholder="VD: Kilogram" error={errors.description?.message} {...register('description')} />

              <Select
                label="Loại đơn vị"
                options={UOM_CLASSES}
                error={errors.uomClass?.message}
                {...register('uomClass')}
              />

              <Controller
                name="isBaseUom"
                control={control}
                render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Đây là đơn vị cơ sở" />}
              />
            </form>

            <div className="flex items-center justify-end gap-3 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>Hủy</Button>
              <Button variant="accent" onClick={handleSubmit(handleFormSubmit)} disabled={isLoading}>{isEdit ? 'Cập nhật' : 'Tạo mới'}</Button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
