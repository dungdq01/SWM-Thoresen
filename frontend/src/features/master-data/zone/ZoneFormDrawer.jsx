import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Grid3X3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Button, Input, Select, Switch } from '@shared/ui'
import { ZONE_TYPES, useLookupWarehouses } from '@domains/master-data'
import { zoneSchema, zoneDefaultValues } from './zoneForm.schema'

export function ZoneFormDrawer({ isOpen, onClose, onSubmit, initialData = null, isLoading = false }) {
  const isEdit = !!initialData

  const { data: warehouses = [] } = useLookupWarehouses()
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: `${w.code || w.warehouseCode} - ${w.name || w.warehouseName}` }))

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(zoneSchema),
    defaultValues: zoneDefaultValues,
  })

  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      reset({
        zoneCode: initialData.zoneCode || '',
        zoneName: initialData.zoneName || '',
        warehouseId: initialData.warehouseId || initialData.warehouse?.id || '',
        zoneType: initialData.zoneType || 'BULK_STORAGE',
        maxCapacityMt: initialData.maxCapacityMt ?? null,
        isBillingZone: initialData.isBillingZone || false,
      })
    } else {
      reset(zoneDefaultValues)
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
    }
    onSubmit(payload)
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <Grid3X3 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">{isEdit ? 'Chỉnh sửa zone' : 'Thêm zone mới'}</h2>
                  <p className="text-sm text-navy-400">Quản lý khu vực trong kho.</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Mã zone" required placeholder="VD: Z-BULK-01" disabled={isEdit} error={errors.zoneCode?.message} {...register('zoneCode')} />
                <Select label="Loại zone" required options={ZONE_TYPES} error={errors.zoneType?.message} {...register('zoneType')} />
              </div>

              <Input label="Tên zone" required placeholder="VD: Khu lưu trữ hàng rời 01" error={errors.zoneName?.message} {...register('zoneName')} />

              <Select label="Kho" required options={warehouseOptions} error={errors.warehouseId?.message} placeholder="Chọn kho..." {...register('warehouseId')} />

              <Controller
                name="maxCapacityMt"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Sức chứa tối đa (MT)"
                    type="number"
                    step="0.01"
                    placeholder="VD: 50000"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    error={errors.maxCapacityMt?.message}
                  />
                )}
              />

              <Controller
                name="isBillingZone"
                control={control}
                render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Đây là billing zone" />}
              />
            </form>

            <div className="flex items-center justify-end gap-3 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>Hủy</Button>
              <Button variant="accent" onClick={handleSubmit(handleFormSubmit)} disabled={isLoading}>{isEdit ? 'Cập nhật' : 'Tạo mới'}</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
