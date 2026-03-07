import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, Input, Textarea, Select, Switch, Button } from '@shared/ui'
import { useCreateReasonCode, useUpdateReasonCode, REASON_CODE_CATEGORIES, REASON_CODE_DOMAINS } from '@domains/auth'

const reasonCodeSchema = z.object({
  code: z.string().min(1, 'Mã lý do là bắt buộc').max(50, 'Tối đa 50 ký tự'),
  description: z.string().min(1, 'Mô tả là bắt buộc').max(200, 'Tối đa 200 ký tự'),
  category: z.string().min(1, 'Danh mục là bắt buộc'),
  domainCode: z.string().min(1, 'Domain là bắt buộc'),
  requiresApproval: z.boolean().default(false),
  affectsBilling: z.boolean().default(false),
  requiresNote: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
})

export function ReasonCodeFormModal({ isOpen, onClose, editData }) {
  const isEdit = !!editData

  const createReasonCode = useCreateReasonCode()
  const updateReasonCode = useUpdateReasonCode()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(reasonCodeSchema),
    defaultValues: {
      code: '',
      description: '',
      category: '',
      domainCode: '',
      requiresApproval: false,
      affectsBilling: false,
      requiresNote: false,
      sortOrder: 0,
    },
  })

  useEffect(() => {
    if (editData) {
      reset({
        code: editData.code,
        description: editData.description,
        category: editData.category,
        domainCode: editData.domainCode,
        requiresApproval: editData.requiresApproval,
        affectsBilling: editData.affectsBilling,
        requiresNote: editData.requiresNote,
        sortOrder: editData.sortOrder || 0,
      })
    } else {
      reset({
        code: '',
        description: '',
        category: '',
        domainCode: '',
        requiresApproval: false,
        affectsBilling: false,
        requiresNote: false,
        sortOrder: 0,
      })
    }
  }, [editData, reset])

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateReasonCode.mutateAsync({ id: editData.id, data })
      } else {
        await createReasonCode.mutateAsync(data)
      }
      onClose()
      reset()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const isLoading = createReasonCode.isPending || updateReasonCode.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa mã lý do' : 'Tạo mã lý do mới'}
      description="Mã lý do dùng để phân loại các thao tác điều chỉnh, sửa đổi trong hệ thống"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isLoading}>
            {isLoading ? 'Đang xử lý...' : isEdit ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Mã lý do"
            placeholder="VD: DAMAGED"
            disabled={isEdit}
            error={errors.code?.message}
            required
            {...register('code')}
          />

          <Input
            label="Thứ tự sắp xếp"
            type="number"
            placeholder="0"
            error={errors.sortOrder?.message}
            {...register('sortOrder', { valueAsNumber: true })}
          />
        </div>

        <Textarea
          label="Mô tả"
          placeholder="Mô tả chi tiết mục đích sử dụng..."
          rows={2}
          error={errors.description?.message}
          required
          {...register('description')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Danh mục"
            options={REASON_CODE_CATEGORIES}
            placeholder="Chọn danh mục"
            error={errors.category?.message}
            required
            {...register('category')}
          />

          <Select
            label="Domain"
            options={REASON_CODE_DOMAINS}
            placeholder="Chọn domain"
            error={errors.domainCode?.message}
            required
            {...register('domainCode')}
          />
        </div>

        <div className="pt-2 space-y-3 border-t border-navy-100">
          <p className="text-sm font-medium text-navy-700">Cấu hình bổ sung</p>
          
          <Switch
            label="Yêu cầu phê duyệt"
            description="Thao tác sử dụng mã này cần được phê duyệt trước khi thực hiện"
            checked={watch('requiresApproval')}
            onChange={(value) => setValue('requiresApproval', value)}
          />

          <Switch
            label="Ảnh hưởng thanh toán"
            description="Thao tác này có thể tác động đến hóa đơn/thanh toán"
            checked={watch('affectsBilling')}
            onChange={(value) => setValue('affectsBilling', value)}
          />

          <Switch
            label="Yêu cầu ghi chú"
            description="Bắt buộc nhập ghi chú khi sử dụng mã lý do này"
            checked={watch('requiresNote')}
            onChange={(value) => setValue('requiresNote', value)}
          />
        </div>
      </form>
    </Modal>
  )
}
