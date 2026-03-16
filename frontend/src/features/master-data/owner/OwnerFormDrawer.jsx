import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Building2, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Button, Input, Select, Textarea } from '@shared/ui'
import { ownerSchema, ownerDefaultValues } from './ownerForm.schema'
import { OWNER_GROUPS, OWNER_TYPES, useOwnerNextCode } from '@domains/master-data'

export function OwnerFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false,
}) {
  const isEdit = !!initialData
  const { data: nextCodeResponse } = useOwnerNextCode(isOpen && !isEdit)
  const nextCode = nextCodeResponse?.data?.code || ''

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(ownerSchema),
    defaultValues: ownerDefaultValues,
  })

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          ownerCode: initialData.ownerCode || '',
          ownerName: initialData.ownerName || '',
          shortName: initialData.shortName || '',
          ownerGroup: initialData.ownerGroup || 'LOCAL',
          ownerType: initialData.ownerType || 'DOMESTIC',
          taxCode: initialData.taxCode || '',
          address: initialData.address || '',
          billingEmail: initialData.billingEmail || '',
          billingContact: initialData.billingContact || '',
          paymentTerms: initialData.paymentTerms || '',
        })
      } else {
        reset(ownerDefaultValues)
      }
    }
  }, [isOpen, initialData, reset])

  // Set ownerCode when nextCode is loaded
  useEffect(() => {
    if (!isEdit && nextCode) {
      setValue('ownerCode', nextCode)
    }
  }, [isEdit, nextCode, setValue])

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
      billingEmail: data.billingEmail || null,
    }
    if (isEdit && initialData) {
      payload.rowVersion = initialData.rowVersion
    } else {
      // Khi tạo mới, sử dụng nextCode từ API
      payload.ownerCode = nextCode
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
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    {isEdit ? 'Chỉnh sửa chủ hàng' : 'Thêm chủ hàng mới'}
                  </h2>
                  <p className="text-sm text-navy-600">
                    {isEdit ? 'Cập nhật thông tin chủ hàng' : 'Nhập thông tin chủ hàng'}
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">
                      Mã chủ hàng {isEdit ? '' : <span className="text-xs text-navy-400 font-normal">(Tự động)</span>}
                    </label>
                    {isEdit ? (
                      <Input
                        value={initialData?.ownerCode || ''}
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
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">
                      Tên viết tắt <span className="text-red-500">*</span>
                    </label>
                    <Input
                      {...register('shortName')}
                      placeholder="VD: ABC"
                      error={errors.shortName?.message}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">
                    Tên chủ hàng <span className="text-red-500">*</span>
                  </label>
                  <Input
                    {...register('ownerName')}
                    placeholder="VD: Công ty TNHH ABC"
                    error={errors.ownerName?.message}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <Controller name="ownerGroup" control={control} render={({ field }) => (
                    <Select
                      label="Nhóm chủ hàng"
                      required
                      options={OWNER_GROUPS}
                      error={errors.ownerGroup?.message}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  )} />
                  <Controller name="ownerType" control={control} render={({ field }) => (
                    <Select
                      label="Loại chủ hàng"
                      required
                      options={OWNER_TYPES}
                      error={errors.ownerType?.message}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  )} />
                </div>

                <div className="border-t border-navy-100 pt-5">
                  <h3 className="text-sm font-semibold text-navy-900 mb-4">Thông tin thuế & thanh toán</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1.5">
                          Mã số thuế <span className="text-red-500">*</span>
                        </label>
                        <Input
                          {...register('taxCode')}
                          placeholder="VD: 0123456789"
                          error={errors.taxCode?.message}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1.5">
                          Điều khoản thanh toán
                        </label>
                        <Input
                          {...register('paymentTerms')}
                          placeholder="VD: NET30"
                          error={errors.paymentTerms?.message}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1.5">
                          Email thanh toán
                        </label>
                        <Input
                          type="email"
                          {...register('billingEmail')}
                          placeholder="VD: billing@abc.com"
                          error={errors.billingEmail?.message}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1.5">
                          Người liên hệ
                        </label>
                        <Input
                          {...register('billingContact')}
                          placeholder="VD: Nguyễn Văn A"
                          error={errors.billingContact?.message}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">
                    Địa chỉ <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    {...register('address')}
                    placeholder="VD: 123 Nguyễn Văn Linh, Q.7, TP.HCM"
                    rows={3}
                    error={errors.address?.message}
                  />
                </div>
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
