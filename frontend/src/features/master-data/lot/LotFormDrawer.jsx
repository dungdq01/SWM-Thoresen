import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Package, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Button, Input, Select, Textarea } from '@shared/ui'
import { lotSchema, lotDefaultValues } from './lotForm.schema'
import { 
  useLotNextCode, 
  useLookupOwners, 
  useLookupItems, 
  useLookupWarehouses,
  LOT_STATUSES,
} from '@domains/master-data'

export function LotFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false,
}) {
  const isEdit = !!initialData
  const { data: nextCodeResponse } = useLotNextCode(isOpen && !isEdit)
  const nextCode = nextCodeResponse?.data?.code || ''

  const { data: owners = [] } = useLookupOwners()
  const { data: items = [] } = useLookupItems()
  const { data: warehouses = [] } = useLookupWarehouses()

  const ownerOptions = owners.map(o => ({ value: o.id, label: `${o.ownerCode || o.code} - ${o.ownerName || o.name}` }))
  const itemOptions = items.map(i => ({ value: i.id, label: `${i.itemCode || i.code} - ${i.itemName || i.name}` }))
  const warehouseOptions = warehouses.map(w => ({ value: w.id, label: `${w.warehouseCode || w.code} - ${w.warehouseName || w.name}` }))

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(lotSchema),
    defaultValues: lotDefaultValues,
  })

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          itemId: initialData.itemId || '',
          ownerId: initialData.ownerId || '',
          warehouseId: initialData.warehouseId || '',
          firstReceivedDate: initialData.firstReceivedDate ? initialData.firstReceivedDate.split('T')[0] : '',
          sourceLotId: initialData.sourceLotId || '',
          status: initialData.status || 'ACTIVE',
          notes: initialData.notes || '',
        })
      } else {
        reset(lotDefaultValues)
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
    const payload = {
      ...data,
      firstReceivedDate: data.firstReceivedDate || undefined,
      sourceLotId: data.sourceLotId || undefined,
      notes: data.notes || undefined,
    }
    if (isEdit && initialData) {
      payload.rowVersion = Number(initialData.rowVersion)
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-navy-100 sm:px-6 sm:py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    {isEdit ? 'Chỉnh sửa lô hàng' : 'Thêm lô hàng mới'}
                  </h2>
                  <p className="text-sm text-navy-600">
                    {isEdit ? 'Cập nhật thông tin lô hàng' : 'Nhập thông tin lô hàng'}
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
              <div className="p-4 space-y-4 sm:p-6 sm:space-y-5">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">
                    Mã lô {isEdit ? '' : <span className="text-xs text-navy-400 font-normal">(Tự động)</span>}
                  </label>
                  {isEdit ? (
                    <Input
                      value={initialData?.lotCode || ''}
                      disabled
                      className="uppercase bg-navy-50 font-mono"
                    />
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2">
                      <Sparkles className="h-4 w-4 text-ice shrink-0" />
                      <span className="font-mono font-semibold text-navy-900">{nextCode || '...'}</span>
                    </div>
                  )}
                </div>

                <Controller name="itemId" control={control} render={({ field }) => (
                  <Select
                    label="Mặt hàng"
                    required
                    options={itemOptions}
                    error={errors.itemId?.message}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    disabled={isEdit}
                    placeholder="Chọn mặt hàng"
                  />
                )} />

                <Controller name="ownerId" control={control} render={({ field }) => (
                  <Select
                    label="Chủ hàng"
                    required
                    options={ownerOptions}
                    error={errors.ownerId?.message}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    disabled={isEdit}
                    placeholder="Chọn chủ hàng"
                  />
                )} />

                <Controller name="warehouseId" control={control} render={({ field }) => (
                  <Select
                    label="Kho"
                    required
                    options={warehouseOptions}
                    error={errors.warehouseId?.message}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    disabled={isEdit}
                    placeholder="Chọn kho"
                  />
                )} />

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">
                    Ngày nhập đầu tiên
                  </label>
                  <Input
                    type="date"
                    {...register('firstReceivedDate')}
                    disabled={isEdit}
                    error={errors.firstReceivedDate?.message}
                  />
                </div>

                {isEdit && (
                  <Controller name="status" control={control} render={({ field }) => (
                    <Select
                      label="Trạng thái lô"
                      options={LOT_STATUSES}
                      error={errors.status?.message}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  )} />
                )}

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">
                    Ghi chú
                  </label>
                  <Textarea
                    {...register('notes')}
                    placeholder="Nhập ghi chú về lô hàng..."
                    rows={3}
                    error={errors.notes?.message}
                  />
                </div>

                {isEdit && initialData?.sourceLotId && (
                  <div className="p-3 bg-navy-50 rounded-lg">
                    <p className="text-sm text-navy-600">
                      <span className="font-medium">Lô nguồn:</span>{' '}
                      <span className="font-mono">{initialData.sourceLot?.lotCode || initialData.sourceLotId}</span>
                    </p>
                  </div>
                )}

                {isEdit && initialData?.lotHash && (
                  <div className="p-3 bg-navy-50 rounded-lg">
                    <p className="text-sm text-navy-600">
                      <span className="font-medium">Lot Hash:</span>{' '}
                      <span className="font-mono text-xs break-all">{initialData.lotHash}</span>
                    </p>
                  </div>
                )}
              </div>
            </form>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-navy-100 bg-navy-50/50 sm:gap-3 sm:px-6 sm:py-4">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Hủy
              </Button>
              <Button
                onClick={handleSubmit(handleFormSubmit)}
                isLoading={isLoading}
                disabled={isLoading}
              >
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
