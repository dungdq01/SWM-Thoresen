import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Layers, X, Sparkles } from 'lucide-react'
import { Button, Input, Select, MultiSelect } from '@shared/ui'
import {
  ITEM_GROUP_CARGO_FORMS,
  useItemGroupNextCode,
  useWarehouseList,
  useUomList,
} from '@domains/master-data'
import { itemGroupDefaultValues, itemGroupSchema } from './itemGroupForm.schema'

export function ItemGroupFormDrawer({ isOpen, onClose, onSubmit, initialData = null, isLoading = false }) {
  const isEdit = !!initialData
  const { data: nextCodeResponse } = useItemGroupNextCode(isOpen && !isEdit)
  const nextCode = nextCodeResponse?.data?.code || ''

  const { data: warehouseResponse } = useWarehouseList({ isActive: true, pageSize: 200 })
  const warehouses = (warehouseResponse?.data || []).map((w) => ({
    value: w.id,
    label: `${w.warehouseCode} — ${w.warehouseName}`,
  }))

  const { data: uomResponse } = useUomList({ isActive: true, uomClass: 'WEIGHT', pageSize: 200 })
  const uoms = (uomResponse?.data || []).map((u) => ({
    value: u.id,
    label: `${u.uomCode} — ${u.description}`,
  }))

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(itemGroupSchema),
    defaultValues: itemGroupDefaultValues,
  })

  const isActive = watch('isActive')

  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      reset({
        itemGroupName: initialData.itemGroupName || '',
        cargoForm: initialData.cargoForm || 'BULK',
        warehouseIds: (initialData.warehouses || []).map((w) => w.warehouse?.id || w.warehouseId).filter(Boolean),
        weighbridgeQtyUomId: initialData.weighbridgeQtyUomId || null,
        isActive: initialData.isActive ?? true,
      })
    } else {
      reset(itemGroupDefaultValues)
    }
  }, [initialData, isOpen, reset])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleFormSubmit = (data) => {
    if (isEdit && initialData) {
      const payload = {
        itemGroupName: data.itemGroupName,
        cargoForm: data.cargoForm,
        weighbridgeQtyUomId: data.weighbridgeQtyUomId || undefined,
        warehouseIds: data.warehouseIds,
        isActive: data.isActive,
        rowVersion: initialData.rowVersion,
      }
      onSubmit(payload)
    } else {
      const payload = {
        itemGroupCode: nextCode,
        itemGroupName: data.itemGroupName,
        cargoForm: data.cargoForm,
        weighbridgeQtyUomId: data.weighbridgeQtyUomId || undefined,
        warehouseIds: data.warehouseIds,
      }
      onSubmit(payload)
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[100vw] sm:max-w-lg flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-moon-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-ice-light">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">{isEdit ? 'Chỉnh sửa nhóm hàng hóa' : 'Thêm nhóm hàng hóa'}</h2>
                  <p className="text-sm text-navy-400">{isEdit ? `Mã: ${initialData?.itemGroupCode}` : 'Điền thông tin bên dưới'}</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-700"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 space-y-5 overflow-y-auto p-6">
              {/* Mã */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                  Mã nhóm {!isEdit && <span className="text-xs text-navy-400 font-normal">(Tự động)</span>}
                </label>
                {isEdit ? (
                  <Input value={initialData?.itemGroupCode || ''} disabled className="uppercase bg-navy-50" />
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-moon-300 bg-navy-50 px-3 py-2">
                    <Sparkles className="h-4 w-4 text-ice shrink-0" />
                    <span className="font-mono font-semibold text-navy-900">{nextCode || '...'}</span>
                  </div>
                )}
              </div>

              {/* Tên */}
              <Input
                label="Tên nhóm hàng hóa"
                required
                error={errors.itemGroupName?.message}
                {...register('itemGroupName')}
              />

              {/* Kho */}
              <Controller
                name="warehouseIds"
                control={control}
                render={({ field }) => (
                  <MultiSelect
                    label="Kho"
                    options={warehouses}
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Chọn kho..."
                    error={errors.warehouseIds?.message}
                  />
                )}
              />

              {/* DVT cân */}
              <Controller
                name="weighbridgeQtyUomId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="DVT cân"
                    options={[{ value: '', label: '— Không chọn —' }, ...uoms]}
                    error={errors.weighbridgeQtyUomId?.message}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                )}
              />

              {/* Chế độ */}
              <Controller
                name="cargoForm"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Chế độ"
                    required
                    options={ITEM_GROUP_CARGO_FORMS}
                    error={errors.cargoForm?.message}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />

              {/* Hoạt động toggle */}
              <div className="flex items-center justify-between rounded-lg border border-moon-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-navy-700">Hoạt động</p>
                  <p className="text-xs text-navy-400">{isActive ? 'Nhóm hàng đang hoạt động' : 'Nhóm hàng đã tắt'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setValue('isActive', !isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-emerald-500' : 'bg-moon-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>Hủy</Button>
              <Button variant="accent" onClick={handleSubmit(handleFormSubmit)} disabled={isLoading}>
                {isEdit ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
