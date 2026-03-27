import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Link2, X } from 'lucide-react'
import { Button, Input, Select } from '@shared/ui'
import { BILLING_CLASSES, useLookupOwners, useLookupItems } from '@domains/master-data'
import { ownerSkuMappingDefaultValues, ownerSkuMappingSchema } from './ownerSkuMappingForm.schema'

export function OwnerSkuMappingFormDrawer({ isOpen, onClose, onSubmit, initialData = null, isLoading = false }) {
  const isEdit = !!initialData
  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm({
    resolver: zodResolver(ownerSkuMappingSchema),
    defaultValues: ownerSkuMappingDefaultValues,
  })

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()

  const ownerOptions = owners.map((o) => ({ value: o.id, label: `${o.code} / ${o.name}` }))
  const itemOptions = items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))

  const watchedOwnerId = watch('ownerId')
  const watchedItemId = watch('itemId')

  // Auto-generate ownerSkuCode when owner+item selected (only on create)
  useEffect(() => {
    if (isEdit) return
    if (!watchedOwnerId || !watchedItemId) return
    const owner = owners.find((o) => o.id === watchedOwnerId)
    const item = items.find((i) => i.id === watchedItemId)
    if (owner && item) {
      setValue('ownerSkuCode', `${owner.code}-${item.code}-001`, { shouldValidate: true })
    }
  }, [watchedOwnerId, watchedItemId, owners, items, setValue, isEdit])

  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      reset({
        ownerId: initialData.ownerId || '',
        itemId: initialData.itemId || '',
        ownerSkuCode: initialData.ownerSkuCode || '',
        ownerSkuName: initialData.ownerSkuName || '',
        billingClass: initialData.billingClass || 'ST01',
        isActive: initialData.isActive ?? true,
      })
    } else {
      reset(ownerSkuMappingDefaultValues)
    }
  }, [initialData, isOpen, reset])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleFormSubmit = (data) => {
    const payload = { ...data }
    if (isEdit && initialData) payload.rowVersion = initialData.rowVersion
    onSubmit(payload)
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[100vw] sm:max-w-lg flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-ice-light">
                  <Link2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">{isEdit ? 'Chỉnh sửa mapping' : 'Thêm mapping chủ hàng - SKU mới'}</h2>
                  <p className="text-sm text-navy-400">Nhập thông tin mapping</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-700"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 space-y-5 overflow-y-auto p-6">
              {isEdit && (
                <Input label="ID" disabled value={initialData?.mappingCode || ''} />
              )}
              <Select label="Chủ hàng" required placeholder="-- Chọn chủ hàng --" options={ownerOptions} error={errors.ownerId?.message} disabled={isEdit} {...register('ownerId')} />
              <Select label="SKU toàn cục" required placeholder="-- Chọn SKU toàn cục --" options={itemOptions} error={errors.itemId?.message} disabled={isEdit} {...register('itemId')} />
              <Input
                label="Mã SKU chủ hàng"
                required
                placeholder="Tự động: MÃ CHỦ HÀNG - MÃ SKU - 001"
                error={errors.ownerSkuCode?.message}
                {...register('ownerSkuCode')}
              />
              <Input label="Tên SKU chủ hàng" required placeholder="VD: Gạo 5% tấm TVL" error={errors.ownerSkuName?.message} {...register('ownerSkuName')} />
              <Controller name="billingClass" control={control} render={({ field }) => (
                <Select label="Billing Class" required options={BILLING_CLASSES} error={errors.billingClass?.message} value={field.value} onChange={(e) => field.onChange(e.target.value)} />
              )} />

              <div className="flex items-center justify-between rounded-lg border border-moon-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-navy-700">Trạng thái</p>
                </div>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <button
                      type="button"
                      onClick={() => field.onChange(!field.value)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${field.value ? 'bg-green-500' : 'bg-moon-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${field.value ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  )}
                />
                <span className="text-sm text-navy-600">{watch('isActive') ? 'Hoạt động' : 'Ngừng hoạt động'}</span>
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>Hủy bỏ</Button>
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
