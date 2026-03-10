import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, Input, Textarea, Select, Button } from '@shared/ui'
import { useCreateRule, useUpdateRule, RULE_DOMAINS, RULE_CURRENT_STATUS, RULE_EFFECTIVE_PHASE } from '@domains/auth'

const ruleSchema = z.object({
  ruleCode: z.string().min(1, 'Mã rule là bắt buộc').max(50, 'Tối đa 50 ký tự'),
  title: z.string().min(1, 'Tên rule là bắt buộc').max(255, 'Tối đa 255 ký tự'),
  description: z.string().min(1, 'Mô tả là bắt buộc'),
  domain: z.string().min(1, 'Phạm vi là bắt buộc').max(50, 'Tối đa 50 ký tự'),
  currentStatus: z.string().min(1, 'Trạng thái là bắt buộc'),
  sourceOfTruth: z.string().min(1, 'Nguồn gốc/Căn cứ là bắt buộc').max(255, 'Tối đa 255 ký tự'),
  effectivePhase: z.string().min(1, 'Giai đoạn áp dụng là bắt buộc'),
  brdReference: z.string().max(255, 'Tối đa 255 ký tự').optional(),
  supersedes: z.string().max(255, 'Tối đa 255 ký tự').optional(),
  ownerRole: z.string().max(50, 'Tối đa 50 ký tự').optional(),
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
      title: '',
      description: '',
      domain: '',
      currentStatus: 'TO_CONFIRM',
      sourceOfTruth: '',
      effectivePhase: 'GO_LIVE',
      brdReference: '',
      supersedes: '',
      ownerRole: '',
    },
  })

  useEffect(() => {
    if (editData) {
      reset({
        ruleCode: editData.ruleCode,
        title: editData.title,
        description: editData.description || '',
        domain: editData.domain,
        currentStatus: editData.currentStatus,
        sourceOfTruth: editData.sourceOfTruth || '',
        effectivePhase: editData.effectivePhase || 'GO_LIVE',
        brdReference: editData.brdReference || '',
        supersedes: editData.supersedes || '',
        ownerRole: editData.ownerRole || '',
      })
    } else {
      reset({
        ruleCode: '',
        title: '',
        description: '',
        domain: '',
        currentStatus: 'TO_CONFIRM',
        sourceOfTruth: '',
        effectivePhase: 'GO_LIVE',
        brdReference: '',
        supersedes: '',
        ownerRole: '',
      })
    }
  }, [editData, reset])

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        // Remove ruleCode and domain for update - backend doesn't accept them
        const { ruleCode, domain, ...updateData } = data
        await updateRule.mutateAsync({ id: editData.id, data: updateData })
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
            label="Phạm vi"
            options={RULE_DOMAINS}
            placeholder="Chọn phạm vi"
            error={errors.domain?.message}
            required
            {...register('domain')}
          />
        </div>

        <Input
          label="Tên Rule"
          placeholder="VD: Quy tắc kiểm tra dung sai cân"
          error={errors.title?.message}
          required
          {...register('title')}
        />

        <Textarea
          label="Mô tả chi tiết"
          placeholder="Mô tả chi tiết nội dung và điều kiện áp dụng của rule..."
          rows={3}
          error={errors.description?.message}
          required
          {...register('description')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Trạng thái hiện tại"
            options={RULE_CURRENT_STATUS}
            error={errors.currentStatus?.message}
            required
            {...register('currentStatus')}
          />

          <Select
            label="Giai đoạn áp dụng"
            options={RULE_EFFECTIVE_PHASE}
            error={errors.effectivePhase?.message}
            required
            {...register('effectivePhase')}
          />
        </div>

        <Input
          label="Nguồn gốc / Căn cứ"
          placeholder="VD: PRD Section 3.2.1, Email từ khách hàng..."
          error={errors.sourceOfTruth?.message}
          required
          {...register('sourceOfTruth')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tài liệu tham chiếu"
            placeholder="VD: BRD-v2.0-Section-4.3"
            error={errors.brdReference?.message}
            {...register('brdReference')}
          />

          <Input
            label="Thay thế cho rule"
            placeholder="Rule bị thay thế (nếu có)"
            error={errors.supersedes?.message}
            {...register('supersedes')}
          />
        </div>

        <Input
          label="Vai trò chịu trách nhiệm"
          placeholder="VD: WH_MANAGER"
          error={errors.ownerRole?.message}
          {...register('ownerRole')}
        />
      </form>
    </Modal>
  )
}
