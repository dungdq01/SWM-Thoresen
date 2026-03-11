import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Users, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Button, Input, Select, Textarea } from '@shared/ui'
import { customerSchema, customerDefaultValues } from './customerForm.schema'
import { CUSTOMER_GROUPS, CUSTOMER_TYPES, useCustomerNextCode } from '@domains/master-data'

export function CustomerFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false,
}) {
  const isEdit = !!initialData
  const { data: nextCodeResponse } = useCustomerNextCode(isOpen && !isEdit)
  const nextCode = nextCodeResponse?.data?.code || ''

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: customerDefaultValues,
  })

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          customerCode: initialData.customerCode || '',
          customerName: initialData.customerName || '',
          shortName: initialData.shortName || '',
          customerGroup: initialData.customerGroup || 'CORPORATE',
          customerType: initialData.customerType || 'BUYER',
          taxCode: initialData.taxCode || '',
          contactName: initialData.contactName || '',
          phone: initialData.phone || '',
          email: initialData.email || '',
          address: initialData.address || '',
          notes: initialData.notes || '',
        })
      } else {
        reset(customerDefaultValues)
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
    } else {
      // Khi tạo mới, sử dụng nextCode từ API
      payload.customerCode = nextCode
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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-navy-900/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-[101] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100 bg-gradient-to-r from-navy-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    {isEdit ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
                  </h2>
                  <p className="text-sm text-navy-500">
                    {isEdit ? `Mã: ${initialData?.customerCode}` : 'Điền thông tin bên dưới'}
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
                      Mã khách hàng {isEdit ? '' : <span className="text-xs text-navy-400 font-normal">(Tự động)</span>}
                    </label>
                    {isEdit ? (
                      <Input
                        value={initialData?.customerCode || ''}
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
                      Tên viết tắt
                    </label>
                    <Input
                      {...register('shortName')}
                      placeholder="VD: ABC"
                      error={errors.shortName?.message}
                    />
                  </div>
                </div>

                <Input
                  label="Tên khách hàng"
                  required
                  {...register('customerName')}
                  placeholder="VD: Công ty TNHH ABC"
                  error={errors.customerName?.message}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Nhóm khách hàng"
                    required
                    options={CUSTOMER_GROUPS}
                    error={errors.customerGroup?.message}
                    {...register('customerGroup')}
                  />
                  <Select
                    label="Loại khách hàng"
                    required
                    options={CUSTOMER_TYPES}
                    error={errors.customerType?.message}
                    {...register('customerType')}
                  />
                </div>

                <Input
                  label="Mã số thuế"
                  {...register('taxCode')}
                  placeholder="VD: 0123456789"
                  error={errors.taxCode?.message}
                />

                <div className="border-t border-navy-100 pt-5">
                  <h3 className="text-sm font-semibold text-navy-900 mb-4">Thông tin liên hệ</h3>
                  
                  <div className="space-y-4">
                    <Input
                      label="Người liên hệ"
                      {...register('contactName')}
                      placeholder="VD: Nguyễn Văn A"
                      error={errors.contactName?.message}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Số điện thoại"
                        {...register('phone')}
                        placeholder="VD: 0901234567"
                        error={errors.phone?.message}
                      />
                      <Input
                        label="Email"
                        type="email"
                        {...register('email')}
                        placeholder="VD: contact@company.com"
                        error={errors.email?.message}
                      />
                    </div>

                    <Textarea
                      label="Địa chỉ"
                      {...register('address')}
                      placeholder="VD: 123 Nguyễn Huệ, Quận 1, TP.HCM"
                      error={errors.address?.message}
                      rows={2}
                    />
                  </div>
                </div>

                <Textarea
                  label="Ghi chú"
                  {...register('notes')}
                  placeholder="Ghi chú thêm về khách hàng..."
                  error={errors.notes?.message}
                  rows={3}
                />
              </div>
            </form>

            <div className="px-6 py-4 border-t border-navy-100 bg-navy-50/50 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Hủy
              </Button>
              <Button
                onClick={handleSubmit(handleFormSubmit)}
                isLoading={isLoading}
              >
                {isEdit ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
