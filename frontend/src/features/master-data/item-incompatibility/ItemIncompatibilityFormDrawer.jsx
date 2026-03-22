import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ShieldAlert, X } from 'lucide-react'
import { Button, Input, Select, Textarea } from '@shared/ui'
import { INCOMPATIBILITY_RULE_TYPES, useLookupItems } from '@domains/master-data'
import { itemIncompatibilityDefaultValues, itemIncompatibilitySchema } from './itemIncompatibilityForm.schema'

export function ItemIncompatibilityFormDrawer({ isOpen, onClose, onSubmit, initialData = null, isLoading = false }) {
  const isEdit = !!initialData
  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm({
    resolver: zodResolver(itemIncompatibilitySchema),
    defaultValues: itemIncompatibilityDefaultValues,
  })

  const { data: items = [] } = useLookupItems()
  const itemOptions = items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))

  const ruleType = watch('ruleType')

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          ruleType: initialData.ruleType || 'ITEM_TO_ITEM',
          itemId: initialData.itemId || '',
          itemGroupId: initialData.itemGroupId || '',
          incompatibleWithItemId: initialData.incompatibleWithItemId || '',
          incompatibleWithGroupId: initialData.incompatibleWithGroupId || '',
          reason: initialData.reason || '',
        })
      } else {
        reset(itemIncompatibilityDefaultValues)
      }
    }
  }, [isOpen, initialData, reset])

  const onFormSubmit = (data) => {
    const payload = { ...data }
    // Clean up unused fields based on ruleType
    if (data.ruleType === 'ITEM_TO_ITEM') {
      delete payload.itemGroupId
      delete payload.incompatibleWithGroupId
    } else if (data.ruleType === 'ITEM_TO_GROUP') {
      delete payload.itemGroupId
      delete payload.incompatibleWithItemId
    } else if (data.ruleType === 'GROUP_TO_GROUP') {
      delete payload.itemId
      delete payload.incompatibleWithItemId
    }
    onSubmit(payload)
  }

  const showLeftItem = ruleType === 'ITEM_TO_ITEM' || ruleType === 'ITEM_TO_GROUP'
  const showLeftGroup = ruleType === 'GROUP_TO_GROUP'
  const showRightItem = ruleType === 'ITEM_TO_ITEM'
  const showRightGroup = ruleType === 'ITEM_TO_GROUP' || ruleType === 'GROUP_TO_GROUP'

  const ruleTypeOptions = INCOMPATIBILITY_RULE_TYPES.map((r) => ({ value: r.value, label: r.label }))

  const drawer = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-navy-900">
                  {isEdit ? 'Sửa quy tắc không tương thích' : 'Thêm quy tắc không tương thích'}
                </h2>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 hover:bg-navy-50 transition-colors">
                <X className="w-5 h-5 text-navy-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Loại quy tắc *</label>
                <Controller
                  name="ruleType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={ruleTypeOptions}
                      disabled={isEdit}
                      error={errors.ruleType?.message}
                    />
                  )}
                />
              </div>

              {showLeftItem && (
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">Mặt hàng A *</label>
                  <Controller
                    name="itemId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        options={[{ value: '', label: 'Chọn mặt hàng...' }, ...itemOptions]}
                        disabled={isEdit}
                        error={errors.itemId?.message}
                      />
                    )}
                  />
                </div>
              )}

              {showLeftGroup && (
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">Nhóm hàng A *</label>
                  <Input {...register('itemGroupId')} placeholder="UUID nhóm hàng" disabled={isEdit} error={errors.itemGroupId?.message} />
                </div>
              )}

              {showRightItem && (
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">Mặt hàng B *</label>
                  <Controller
                    name="incompatibleWithItemId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        options={[{ value: '', label: 'Chọn mặt hàng...' }, ...itemOptions]}
                        disabled={isEdit}
                        error={errors.incompatibleWithItemId?.message}
                      />
                    )}
                  />
                </div>
              )}

              {showRightGroup && (
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">Nhóm hàng B *</label>
                  <Input {...register('incompatibleWithGroupId')} placeholder="UUID nhóm hàng" disabled={isEdit} error={errors.incompatibleWithGroupId?.message} />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Lý do *</label>
                <Textarea {...register('reason')} placeholder="Nhập lý do không tương thích..." rows={3} error={errors.reason?.message} />
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-navy-100">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>Hủy</Button>
              <Button onClick={handleSubmit(onFormSubmit)} isLoading={isLoading}>
                {isEdit ? 'Cập nhật' : 'Tạo quy tắc'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(drawer, document.body)
}
