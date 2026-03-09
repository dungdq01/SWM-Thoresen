import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Ship } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Button, Input, Select } from '@shared/ui'
import { vendorSchema, vendorDefaultValues } from './vendorForm.schema'
import { SUPPLIER_GROUPS } from '@domains/master-data'

export function VendorFormDrawer({
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
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(vendorSchema),
    defaultValues: vendorDefaultValues,
  })

  const supplierGroup = watch('supplierGroup')

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          vendorCode: initialData.vendorCode || '',
          vendorName: initialData.vendorName || '',
          supplierGroup: initialData.supplierGroup || 'VESSEL',
          countryRegion: initialData.countryRegion || 'VN',
          vesselName: initialData.vesselName || '',
          contactName: initialData.contactName || '',
          phone: initialData.phone || '',
          email: initialData.email || '',
        })
      } else {
        reset(vendorDefaultValues)
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
      email: data.email || null,
    }
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
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Ship className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">
                    {isEdit ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
                  </h2>
                  <p className="text-sm text-navy-600">
                    {isEdit ? 'Cập nhật thông tin nhà cung cấp' : 'Nhập thông tin nhà cung cấp/tàu'}
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
                      Mã nhà cung cấp <span className="text-red-500">*</span>
                    </label>
                    <Input
                      {...register('vendorCode')}
                      placeholder="VD: VND001"
                      disabled={isEdit}
                      error={errors.vendorCode?.message}
                      className="uppercase"
                    />
                  </div>
                  <Select
                    label="Nhóm"
                    required
                    options={SUPPLIER_GROUPS}
                    error={errors.supplierGroup?.message}
                    {...register('supplierGroup')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">
                    Tên nhà cung cấp <span className="text-red-500">*</span>
                  </label>
                  <Input
                    {...register('vendorName')}
                    placeholder="VD: Công ty vận tải ABC"
                    error={errors.vendorName?.message}
                  />
                </div>

                {supplierGroup === 'VESSEL' && (
                  <div className="p-4 bg-blue-50 rounded-xl space-y-4">
                    <h3 className="text-sm font-semibold text-blue-900">Thông tin tàu</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1.5">
                          Tên tàu
                        </label>
                        <Input
                          {...register('vesselName')}
                          placeholder="VD: MV ABC"
                          error={errors.vesselName?.message}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1.5">
                          Quốc gia/Vùng
                        </label>
                        <Input
                          {...register('countryRegion')}
                          placeholder="VD: VN"
                          error={errors.countryRegion?.message}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-navy-100 pt-5">
                  <h3 className="text-sm font-semibold text-navy-900 mb-4">Thông tin liên hệ</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1.5">
                        Người liên hệ
                      </label>
                      <Input
                        {...register('contactName')}
                        placeholder="VD: Nguyễn Văn A"
                        error={errors.contactName?.message}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1.5">
                          Số điện thoại
                        </label>
                        <Input
                          {...register('phone')}
                          placeholder="VD: 0901234567"
                          error={errors.phone?.message}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-1.5">
                          Email
                        </label>
                        <Input
                          type="email"
                          {...register('email')}
                          placeholder="VD: contact@abc.com"
                          error={errors.email?.message}
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
