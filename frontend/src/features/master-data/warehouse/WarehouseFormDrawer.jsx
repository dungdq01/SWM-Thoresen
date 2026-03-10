import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Warehouse } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Button, Input, Select, Textarea, Switch } from '@shared/ui'
import { warehouseSchema, warehouseDefaultValues } from './warehouseForm.schema'
import { WAREHOUSE_TYPES } from '@domains/master-data'

export function WarehouseFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false,
}) {
  const isEdit = !!initialData

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(warehouseSchema),
    defaultValues: warehouseDefaultValues,
  })

  const hasWeighbridge = watch('hasWeighbridge')

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          warehouseCode: initialData.warehouseCode || '',
          warehouseName: initialData.warehouseName || '',
          warehouseType: initialData.warehouseType || 'COVERED',
          totalAreaM2: initialData.totalAreaM2 != null ? Number(initialData.totalAreaM2) : null,
          usableAreaM2: initialData.usableAreaM2 != null ? Number(initialData.usableAreaM2) : null,
          maxHeightM: initialData.maxHeightM != null ? Number(initialData.maxHeightM) : null,
          maxCapacityMt: initialData.maxCapacityMt != null ? Number(initialData.maxCapacityMt) : null,
          address: initialData.address || '',
          hasWeighbridge: initialData.hasWeighbridge || false,
          weighbridgeCount: initialData.weighbridgeCount != null ? Number(initialData.weighbridgeCount) : null,
          capacityWarningPct: initialData.capacityWarningPct != null ? Number(initialData.capacityWarningPct) : 85,
        })
      } else {
        reset(warehouseDefaultValues)
      }
    }
  }, [isOpen, initialData, reset])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy-950/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Warehouse className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    {isEdit ? 'Chỉnh sửa kho' : 'Thêm kho mới'}
                  </h2>
                  <p className="text-sm text-navy-600">
                    {isEdit ? 'Cập nhật thông tin kho' : 'Nhập thông tin kho'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-navy-400 hover:text-navy-600 hover:bg-navy-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">
                      Mã kho <span className="text-red-500">*</span>
                    </label>
                    <Input
                      {...register('warehouseCode')}
                      placeholder="VD: WH5.1"
                      disabled={isEdit}
                      error={errors.warehouseCode?.message}
                    />
                  </div>
                  <Select
                    label="Loại kho"
                    required
                    options={WAREHOUSE_TYPES}
                    error={errors.warehouseType?.message}
                    {...register('warehouseType')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">
                    Tên kho <span className="text-red-500">*</span>
                  </label>
                  <Input
                    {...register('warehouseName')}
                    placeholder="VD: Kho 5.1 - Phú Mỹ"
                    error={errors.warehouseName?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">
                    Địa chỉ
                  </label>
                  <Textarea
                    {...register('address')}
                    placeholder="VD: KCN Phú Mỹ, Bà Rịa - Vũng Tàu"
                    rows={2}
                    error={errors.address?.message}
                  />
                </div>

                <div className="border-t border-navy-100 pt-5">
                  <h3 className="text-sm font-semibold text-navy-900 mb-4">Thông số kỹ thuật</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1.5">
                        Diện tích tổng (m²)
                      </label>
                      <Controller
                        name="totalAreaM2"
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="VD: 50000"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            error={errors.totalAreaM2?.message}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1.5">
                        Diện tích sử dụng (m²)
                      </label>
                      <Controller
                        name="usableAreaM2"
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="VD: 45000"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            error={errors.usableAreaM2?.message}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1.5">
                        Chiều cao tối đa (m)
                      </label>
                      <Controller
                        name="maxHeightM"
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="VD: 12"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            error={errors.maxHeightM?.message}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1.5">
                        Sức chứa tối đa (MT)
                      </label>
                      <Controller
                        name="maxCapacityMt"
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="VD: 100000"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            error={errors.maxCapacityMt?.message}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-navy-100 pt-5">
                  <h3 className="text-sm font-semibold text-navy-900 mb-4">Cấu hình cân</h3>
                  <div className="space-y-4">
                    <Controller
                      name="hasWeighbridge"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          label="Có trạm cân"
                        />
                      )}
                    />
                    {hasWeighbridge && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-navy-700 mb-1.5">
                            Số lượng cân
                          </label>
                          <Controller
                            name="weighbridgeCount"
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                placeholder="VD: 2"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                error={errors.weighbridgeCount?.message}
                              />
                            )}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-navy-700 mb-1.5">
                            Ngưỡng cảnh báo sức chứa (%)
                          </label>
                          <Controller
                            name="capacityWarningPct"
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                placeholder="VD: 85"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                error={errors.capacityWarningPct?.message}
                              />
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-navy-100 bg-navy-50/50">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Hủy bỏ
              </Button>
              <Button onClick={handleSubmit(handleFormSubmit)} isLoading={isLoading}>
                {isEdit ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
