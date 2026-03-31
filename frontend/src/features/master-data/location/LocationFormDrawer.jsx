import { useEffect } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, MapPin, DoorOpen, Plus, Trash2 } from 'lucide-react'
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

  const { fields: doorFields, append: appendDoor, remove: removeDoor } = useFieldArray({
    control,
    name: 'doorConfig.doors',
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
        locationWidthM: initialData.locationWidthM != null ? Number(initialData.locationWidthM) : null,
        locationDepthM: initialData.locationDepthM != null ? Number(initialData.locationDepthM) : null,
        areaM2: initialData.areaM2 != null ? Number(initialData.areaM2) : null,
        stackLimitKg: initialData.stackLimitKg != null ? Number(initialData.stackLimitKg) : null,
        doorConfig: initialData.doorConfig || { doors: [{ wall: 'front' }] },
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
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[100vw] sm:max-w-xl flex-col bg-white shadow-2xl">
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
                <Controller name="locationType" control={control} render={({ field }) => (
                  <Select label="Loại vị trí" required options={LOCATION_TYPES} error={errors.locationType?.message} value={field.value} onChange={(e) => field.onChange(e.target.value)} />
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Controller name="warehouseId" control={control} render={({ field }) => (
                  <Select label="Kho" required options={warehouseOptions} placeholder="Chọn kho..." error={errors.warehouseId?.message} value={field.value} onChange={(e) => field.onChange(e.target.value)} />
                )} />
                <Controller name="zoneId" control={control} render={({ field }) => (
                  <Select label="Zone" required options={zoneOptions} placeholder={warehouseId ? 'Chọn zone...' : 'Chọn kho trước'} error={errors.zoneId?.message} value={field.value} onChange={(e) => field.onChange(e.target.value)} />
                )} />
              </div>

              <Controller name="locationProfile" control={control} render={({ field }) => (
                <Select label="Profile" options={LOCATION_PROFILES} error={errors.locationProfile?.message} value={field.value} onChange={(e) => field.onChange(e.target.value)} />
              )} />

              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="locationWidthM"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Chiều rộng (m)"
                      type="number"
                      step="1"
                      min="1"
                      placeholder="VD: 5"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Math.round(Number(e.target.value)) : null)}
                      error={errors.locationWidthM?.message}
                    />
                  )}
                />
                <Controller
                  name="locationDepthM"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Chiều dài (m)"
                      type="number"
                      step="1"
                      min="1"
                      placeholder="VD: 3"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Math.round(Number(e.target.value)) : null)}
                      error={errors.locationDepthM?.message}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="areaM2"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="Diện tích (m²)"
                      type="number"
                      step="1"
                      placeholder="VD: 500"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Math.round(Number(e.target.value)) : null)}
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
                      step="1"
                      placeholder="VD: 100000"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Math.round(Number(e.target.value)) : null)}
                      error={errors.stackLimitKg?.message}
                    />
                  )}
                />
              </div>

              {/* Door configuration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="h-4 w-4 text-navy-500" />
                    <span className="text-sm font-medium text-navy-700">Cấu hình cửa (3D)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => appendDoor({ wall: 'front' })}
                    disabled={doorFields.length >= 4}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-cyan-600 transition-colors hover:bg-cyan-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm cửa
                  </button>
                </div>

                {doorFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3 rounded-lg border border-moon-200 bg-moon-50 px-3 py-2">
                    <span className="text-xs font-medium text-navy-400 w-14">Cửa {index + 1}</span>
                    <Controller
                      name={`doorConfig.doors.${index}.wall`}
                      control={control}
                      render={({ field: f }) => (
                        <select
                          value={f.value}
                          onChange={(e) => f.onChange(e.target.value)}
                          className="flex-1 rounded-md border border-moon-300 bg-white px-3 py-1.5 text-sm text-navy-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="front">Mặt trước</option>
                          <option value="back">Mặt sau</option>
                          <option value="left">Bên trái</option>
                          <option value="right">Bên phải</option>
                        </select>
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => removeDoor(index)}
                      className="rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {doorFields.length === 0 && (
                  <p className="text-xs text-navy-400 italic">Không có cửa</p>
                )}
                <p className="text-[11px] text-navy-400">Chọn vị trí cửa trên mỗi mặt tường trong mô hình 3D. Tối đa 4 cửa, hoặc 0 nếu không cần.</p>
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
