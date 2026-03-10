import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Button, Input, Select } from '@shared/ui'
import { LOCATION_TYPES, LOCATION_PROFILES, useLookupWarehouses, useLookupZones } from '@domains/master-data'
import { locationSchema, locationDefaultValues } from './locationForm.schema'

export function LocationFormDrawer({ isOpen, onClose, onSubmit, initialData = null, isLoading = false }) {
  const isEdit = !!initialData

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(locationSchema),
    defaultValues: locationDefaultValues,
  })

  const warehouseId = watch('warehouseId')

  const { data: warehouses = [] } = useLookupWarehouses()
  const { data: zones = [] } = useLookupZones(warehouseId)

  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: `${w.code || w.warehouseCode} - ${w.name || w.warehouseName}` }))
  const zoneOptions = zones.map((z) => ({ value: z.id, label: `${z.code || z.zoneCode} - ${z.name || z.zoneName}` }))

  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      reset({
        locationCode: initialData.locationCode || '',
        warehouseId: initialData.warehouseId || initialData.warehouse?.id || '',
        zoneId: initialData.zoneId || initialData.zone?.id || '',
        locationType: initialData.locationType || 'STORAGE',
        locationProfile: initialData.locationProfile || 'STANDARD',
        areaM2: initialData.areaM2 != null ? Number(initialData.areaM2) : null,
        stackLimitKg: initialData.stackLimitKg != null ? Number(initialData.stackLimitKg) : null,
      })
    } else {
      reset(locationDefaultValues)
    }
  }, [initialData, isOpen, reset])

  useEffect(() => {
    if (!isEdit) {
      setValue('zoneId', '')
    }
  }, [warehouseId, isEdit, setValue])

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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">{isEdit ? 'Chỉnh sửa vị trí' : 'Thêm vị trí mới'}</h2>
                  <p className="text-sm text-navy-400">Quản lý vị trí lưu trữ trong kho.</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Mã vị trí" required placeholder="VD: LOC-A1-01" disabled={isEdit} error={errors.locationCode?.message} {...register('locationCode')} />
                <Select label="Loại vị trí" required options={LOCATION_TYPES} error={errors.locationType?.message} {...register('locationType')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select label="Kho" required options={warehouseOptions} placeholder="Chọn kho..." error={errors.warehouseId?.message} {...register('warehouseId')} />
                <Select label="Zone" required options={zoneOptions} placeholder={warehouseId ? 'Chọn zone...' : 'Chọn kho trước'} error={errors.zoneId?.message} {...register('zoneId')} />
              </div>

              <Select label="Profile" options={LOCATION_PROFILES} error={errors.locationProfile?.message} {...register('locationProfile')} />

              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="areaM2"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Diện tích (m²)"
                      type="number"
                      step="0.01"
                      placeholder="VD: 500"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      error={errors.areaM2?.message}
                    />
                  )}
                />
                <Controller
                  name="stackLimitKg"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Giới hạn tải (kg)"
                      type="number"
                      step="0.01"
                      placeholder="VD: 100000"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      error={errors.stackLimitKg?.message}
                    />
                  )}
                />
              </div>
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
