import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Package, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Button, Input, Select } from '@shared/ui'
import { itemSchema, itemDefaultValues } from './itemForm.schema'
import { CARGO_FORMS, PRODUCT_GROUPS, useLookupUoms, useLookupItems, useItemNextCode } from '@domains/master-data'

export function ItemFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false,
}) {
  const isEdit = !!initialData
  const { data: nextCodeResponse } = useItemNextCode(isOpen && !isEdit)
  const nextCode = nextCodeResponse?.data?.code || ''
  const { data: uoms = [] } = useLookupUoms()
  const { data: existingItems = [] } = useLookupItems()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: itemDefaultValues,
  })

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          itemCode: initialData.itemCode || '',
          itemName: initialData.itemName || '',
          itemNameEn: initialData.itemNameEn || '',
          cargoForm: initialData.cargoForm || 'BULK',
          productGroup: initialData.productGroup || 'AGRICULTURAL',
          baseUomId: initialData.baseUomId || '',
          billingUomId: initialData.billingUomId || '',
          stdGrossWeight: initialData.stdGrossWeight || null,
          stdNetWeight: initialData.stdNetWeight || null,
          tolerancePctInbound: initialData.tolerancePctInbound || null,
          tolerancePctOutbound: initialData.tolerancePctOutbound || null,
        })
      } else {
        reset(itemDefaultValues)
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
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    {isEdit ? 'Chỉnh sửa mặt hàng' : 'Thêm mặt hàng mới'}
                  </h2>
                  <p className="text-sm text-navy-600">
                    {isEdit ? 'Cập nhật thông tin mặt hàng' : 'Nhập thông tin mặt hàng'}
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
                      Mã mặt hàng {isEdit ? '' : <span className="text-xs text-navy-400 font-normal">(Tự động)</span>}
                    </label>
                    {isEdit ? (
                      <Input
                        value={initialData?.itemCode || ''}
                        disabled
                        className="uppercase bg-navy-50"
                      />
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2">
                        <Sparkles className="h-4 w-4 text-ice shrink-0" />
                        <span className="font-mono font-semibold text-navy-900">{nextCode || '...'}</span>
                      </div>
                    )}
                  </div>
                  <Select
                    label="Nhóm sản phẩm"
                    required
                    options={PRODUCT_GROUPS}
                    error={errors.productGroup?.message}
                    {...register('productGroup')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">
                    Tên mặt hàng <span className="text-red-500">*</span>
                  </label>
                  <Input
                    {...register('itemName')}
                    placeholder="VD: Gạo ST25"
                    error={errors.itemName?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">
                    Tên tiếng Anh
                  </label>
                  <Input
                    {...register('itemNameEn')}
                    placeholder="VD: ST25 Rice"
                    error={errors.itemNameEn?.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Dạng hàng"
                    required
                    options={CARGO_FORMS}
                    error={errors.cargoForm?.message}
                    {...register('cargoForm')}
                  />
                  <Select
                    label="Đơn vị tính cơ bản"
                    required
                    placeholder="Chọn đơn vị"
                    options={uoms.map((u) => ({ value: u.id, label: `${u.code} - ${u.name}` }))}
                    error={errors.baseUomId?.message}
                    {...register('baseUomId')}
                  />
                </div>

                <div className="border-t border-navy-100 pt-5">
                  <h3 className="text-sm font-semibold text-navy-900 mb-4">Thông số kỹ thuật</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1.5">
                          Trọng lượng tịnh chuẩn (kg)
                        </label>
                        <Controller
                          name="stdNetWeight"
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="VD: 49.5"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              error={errors.stdNetWeight?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1.5">
                          Trọng lượng tổng chuẩn (kg)
                        </label>
                        <Controller
                          name="stdGrossWeight"
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="VD: 50"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              error={errors.stdGrossWeight?.message}
                            />
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1.5">
                          Dung sai nhập (%)
                        </label>
                        <Controller
                          name="tolerancePctInbound"
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="VD: 2"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              error={errors.tolerancePctInbound?.message}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1.5">
                          Dung sai xuất (%)
                        </label>
                        <Controller
                          name="tolerancePctOutbound"
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="VD: 1.5"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              error={errors.tolerancePctOutbound?.message}
                            />
                          )}
                        />
                      </div>
                    </div>
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
