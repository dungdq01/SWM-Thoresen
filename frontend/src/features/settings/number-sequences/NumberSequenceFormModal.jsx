import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, Input, Textarea, Select, Switch, Button } from '@shared/ui'
import { useCreateNumberSequence, useUpdateNumberSequence, SEQUENCE_SCOPE_TYPES, SEQUENCE_RESET_POLICIES } from '@domains/auth'

const sequenceSchema = z.object({
  sequenceCode: z.string().min(1, 'Mã sequence là bắt buộc').max(30, 'Tối đa 30 ký tự'),
  description: z.string().max(255, 'Tối đa 255 ký tự').optional(),
  scopeType: z.string().min(1, 'Loại scope là bắt buộc'),
  resetPolicy: z.string().min(1, 'Chính sách reset là bắt buộc'),
  prefixTemplate: z.string().min(1, 'Prefix là bắt buộc').max(100, 'Tối đa 100 ký tự'),
  formatTemplate: z.string().min(1, 'Template format là bắt buộc').max(150, 'Tối đa 150 ký tự'),
  runningNoLength: z.number().int().min(1).max(10).default(6),
  allowGap: z.boolean().default(false),
})

export function NumberSequenceFormModal({ isOpen, onClose, editData }) {
  const isEdit = !!editData

  const createSequence = useCreateNumberSequence()
  const updateSequence = useUpdateNumberSequence()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(sequenceSchema),
    defaultValues: {
      sequenceCode: '',
      description: '',
      scopeType: 'PER_WAREHOUSE',
      resetPolicy: 'DAILY',
      prefixTemplate: 'SEQ',
      formatTemplate: '{prefix}-{yyyymmdd}-{running_no}',
      runningNoLength: 6,
      allowGap: false,
    },
  })

  useEffect(() => {
    if (editData) {
      reset({
        sequenceCode: editData.sequenceCode,
        description: editData.description,
        scopeType: editData.scopeType,
        resetPolicy: editData.resetPolicy,
        prefixTemplate: editData.prefixTemplate || 'SEQ',
        formatTemplate: editData.formatTemplate,
        runningNoLength: editData.runningNoLength || 6,
        allowGap: editData.allowGap || false,
      })
    } else {
      reset({
        sequenceCode: '',
        description: '',
        scopeType: 'PER_WAREHOUSE',
        resetPolicy: 'DAILY',
        prefixTemplate: 'SEQ',
        formatTemplate: '{prefix}-{yyyymmdd}-{running_no}',
        runningNoLength: 6,
        allowGap: false,
      })
    }
  }, [editData, reset])

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateSequence.mutateAsync({ id: editData.id, data })
      } else {
        await createSequence.mutateAsync(data)
      }
      onClose()
      reset()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const isLoading = createSequence.isPending || updateSequence.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa Number Sequence' : 'Tạo Number Sequence mới'}
      description="Cấu hình quy tắc sinh số tự động cho chứng từ trong hệ thống"
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
            label="Mã sequence"
            placeholder="VD: RCV, SHP, ADJ"
            disabled={isEdit}
            error={errors.sequenceCode?.message}
            required
            {...register('sequenceCode')}
          />

          <Input
            label="Prefix"
            placeholder="VD: RCV"
            error={errors.prefixTemplate?.message}
            required
            {...register('prefixTemplate')}
          />
        </div>

        <Textarea
          label="Mô tả"
          placeholder="Mô tả mục đích sử dụng sequence..."
          rows={2}
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Loại scope"
            options={SEQUENCE_SCOPE_TYPES}
            error={errors.scopeType?.message}
            required
            {...register('scopeType')}
          />

          <Select
            label="Chính sách reset"
            options={SEQUENCE_RESET_POLICIES}
            error={errors.resetPolicy?.message}
            required
            {...register('resetPolicy')}
          />
        </div>

        <Input
          label="Format Template"
          placeholder="{prefix}-{yyyymmdd}-{running_no}"
          hint="Các biến: {prefix}, {yyyymmdd}, {yyyymm}, {yyyy}, {running_no}"
          error={errors.formatTemplate?.message}
          required
          {...register('formatTemplate')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Độ dài số thứ tự"
            type="number"
            min={1}
            max={10}
            placeholder="6"
            hint="Số sẽ được pad với 0 ở đầu"
            error={errors.runningNoLength?.message}
            {...register('runningNoLength', { valueAsNumber: true })}
          />

          <div className="flex items-end pb-1">
            <Switch
              label="Cho phép gap"
              description="Cho phép bỏ qua số khi có lỗi"
              checked={watch('allowGap')}
              onChange={(value) => setValue('allowGap', value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
