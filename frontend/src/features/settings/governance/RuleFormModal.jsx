import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, Input, Textarea, Select, Button } from '@shared/ui'
import { useCreateRule, useUpdateRule, RULE_STATUS, RULE_DOMAINS } from '@domains/auth'

const ruleSchema = z.object({
  ruleCode: z.string().min(1, 'Mã rule là bắt buộc').max(50, 'Tối đa 50 ký tự'),
  ruleName: z.string().min(1, 'Tên rule là bắt buộc').max(200, 'Tối đa 200 ký tự'),
  description: z.string().max(1000, 'Tối đa 1000 ký tự').optional(),
  domain: z.string().min(1, 'Domain là bắt buộc'),
  status: z.string().min(1, 'Trạng thái là bắt buộc'),
  rationale: z.string().max(1000, 'Tối đa 1000 ký tự').optional(),
})

export function RuleFormModal({ isOpen, onClose, editData }) {
  const isEdit = !!editData

  const createRule = useCreateRule()
  const updateRule = useUpdateRule()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      ruleCode: '',
      ruleName: '',
      description: '',
      domain: '',
      status: 'DRAFT',
      rationale: '',
    },
  })

  useEffect(() => {
    if (editData) {
      reset({
        ruleCode: editData.ruleCode,
        ruleName: editData.ruleName,
        description: editData.description || '',
        domain: editData.domain,
        status: editData.status,
        rationale: editData.rationale || '',
      })
    } else {
      reset({
        ruleCode: '',
        ruleName: '',
        description: '',
        domain: '',
        status: 'DRAFT',
        rationale: '',
      })
    }
  }, [editData, reset])

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateRule.mutateAsync({ id: editData.id, data })
      } else {
        await createRule.mutateAsync(data)
      }
      onClose()
      reset()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const isLoading = createRule.isPending || updateRule.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa Business Rule' : 'Tạo Business Rule mới'}
      description="Định nghĩa và quản lý các quy tắc nghiệp vụ trong hệ thống"
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
            label="Mã Rule"
            placeholder="VD: FG-BR-001"
            disabled={isEdit}
            error={errors.ruleCode?.message}
            required
            {...register('ruleCode')}
          />

          <Select
            label="Domain"
            options={RULE_DOMAINS}
            placeholder="Chọn domain"
            error={errors.domain?.message}
            required
            {...register('domain')}
          />
        </div>

        <Input
          label="Tên Rule"
          placeholder="VD: Quy tắc kiểm tra dung sai cân"
          error={errors.ruleName?.message}
          required
          {...register('ruleName')}
        />

        <Textarea
          label="Mô tả chi tiết"
          placeholder="Mô tả chi tiết nội dung và điều kiện áp dụng của rule..."
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />

        <Select
          label="Trạng thái"
          options={RULE_STATUS}
          error={errors.status?.message}
          required
          {...register('status')}
        />

        <Textarea
          label="Lý do / Rationale"
          placeholder="Lý do tại sao cần áp dụng rule này..."
          rows={2}
          error={errors.rationale?.message}
          {...register('rationale')}
        />
      </form>
    </Modal>
  )
}
