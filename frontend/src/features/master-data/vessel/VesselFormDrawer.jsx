import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Ship, X, Sparkles } from 'lucide-react'
import { Button, Input, Select } from '@shared/ui'
import { VESSEL_TYPES, useVesselNextCode } from '@domains/master-data'
import { vesselDefaultValues, vesselSchema } from './vesselForm.schema'

export function VesselFormDrawer({ isOpen, onClose, onSubmit, initialData = null, isLoading = false }) {
  const isEdit = !!initialData
  const { data: nextCodeResponse } = useVesselNextCode(isOpen && !isEdit)
  const nextCode = nextCodeResponse?.data?.code || ''
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
    resolver: zodResolver(vesselSchema),
    defaultValues: vesselDefaultValues,
  })

  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      reset({
        vesselName: initialData.vesselName || '',
        imoNumber: initialData.imoNumber || '',
        vesselType: initialData.vesselType || 'BULK_CARRIER',
        nationality: initialData.nationality || '',
        dwtTon: initialData.dwtTon ?? '',
        loaM: initialData.loaM ?? '',
        beamM: initialData.beamM ?? '',
        draftM: initialData.draftM ?? '',
        callSign: initialData.callSign || '',
        yearBuilt: initialData.yearBuilt ?? '',
        owner: initialData.owner || '',
        operator: initialData.operator || '',
        notes: initialData.notes || '',
      })
    } else {
      reset(vesselDefaultValues)
    }
  }, [initialData, isOpen, reset])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleFormSubmit = (data) => {
    const payload = {
      ...data,
      imoNumber: data.imoNumber || null,
      nationality: data.nationality || null,
      callSign: data.callSign || null,
      owner: data.owner || null,
      operator: data.operator || null,
      notes: data.notes || null,
    }
    if (isEdit && initialData) {
      payload.rowVersion = initialData.rowVersion
    } else {
      payload.vesselCode = nextCode
    }
    onSubmit(payload)
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
                  <Ship className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">{isEdit ? 'Chỉnh sửa tàu / sà lan' : 'Thêm tàu mới'}</h2>
                  <p className="text-sm text-navy-400">{isEdit ? `Mã: ${initialData?.vesselCode}` : 'Điền thông tin bên dưới'}</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-moon-100 hover:text-navy-700"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 space-y-5 overflow-y-auto p-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy-700">
                  Mã tàu {!isEdit && <span className="text-xs text-navy-400 font-normal">(Tự động)</span>}
                </label>
                {isEdit ? (
                  <Input value={initialData?.vesselCode || ''} disabled className="uppercase bg-navy-50" />
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-moon-300 bg-navy-50 px-3 py-2">
                    <Sparkles className="h-4 w-4 text-ice shrink-0" />
                    <span className="font-mono font-semibold text-navy-900">{nextCode || '...'}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Tên tàu" required error={errors.vesselName?.message} {...register('vesselName')} className="col-span-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Số IMO" placeholder="VD: 9876543" error={errors.imoNumber?.message} {...register('imoNumber')} />
                <Controller name="vesselType" control={control} render={({ field }) => (
                  <Select label="Loại tàu" required options={VESSEL_TYPES} error={errors.vesselType?.message} value={field.value} onChange={(e) => field.onChange(e.target.value)} />
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Quốc tịch tàu" placeholder="VD: Vietnam" error={errors.nationality?.message} {...register('nationality')} />
                <Input label="Hô hiệu (Call sign)" placeholder="VD: 3WDP" error={errors.callSign?.message} {...register('callSign')} />
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">Thông số kỹ thuật</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="DWT (tấn)" type="number" placeholder="VD: 28500" error={errors.dwtTon?.message} {...register('dwtTon')} />
                <Input label="LOA (m)" type="number" placeholder="VD: 169.9" error={errors.loaM?.message} {...register('loaM')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Beam (m)" type="number" placeholder="VD: 27.2" error={errors.beamM?.message} {...register('beamM')} />
                <Input label="Draft (m)" type="number" placeholder="VD: 9.8" error={errors.draftM?.message} {...register('draftM')} />
              </div>
              <Input label="Năm đóng" type="number" placeholder="VD: 2018" error={errors.yearBuilt?.message} {...register('yearBuilt')} />

              <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">Chủ tàu &amp; Vận hành</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Chủ tàu" placeholder="VD: TVL Shipping" error={errors.owner?.message} {...register('owner')} />
                <Input label="Đơn vị vận hành" placeholder="VD: TVL Shipping" error={errors.operator?.message} {...register('operator')} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-700">Ghi chú</label>
                <textarea rows={3} placeholder="Nhập ghi chú..." className="w-full rounded-lg border border-moon-300 bg-white px-3 py-2 text-sm text-navy-900 placeholder-navy-400 focus:border-ice-DEFAULT focus:outline-none focus:ring-2 focus:ring-ice-DEFAULT/20 resize-none" {...register('notes')} />
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 border-t border-moon-200 bg-moon-50 px-6 py-4">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>Hủy bỏ</Button>
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
