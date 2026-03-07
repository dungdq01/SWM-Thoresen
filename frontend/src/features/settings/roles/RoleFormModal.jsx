import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, Input, Textarea, Switch, Button } from '@shared/ui'
import { useCreateRole, useUpdateRole } from '@domains/auth'

const roleSchema = z.object({
  roleCode: z.string().min(1, 'Mã vai trò là bắt buộc').max(50, 'Tối đa 50 ký tự'),
  roleName: z.string().min(1, 'Tên vai trò là bắt buộc').max(100, 'Tối đa 100 ký tự'),
  description: z.string().max(500, 'Tối đa 500 ký tự').optional(),
  isActive: z.boolean().default(true),
})

export function RoleFormModal({ isOpen, onClose, editData }) {
  const isEdit = !!editData

  const createRole = useCreateRole()
  const updateRole = useUpdateRole()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      roleCode: '',
      roleName: '',
      description: '',
      isActive: true,
    },
  })

  useEffect(() => {
    if (editData) {
      reset({
        roleCode: editData.roleCode,
        roleName: editData.roleName,
        description: editData.description || '',
        isActive: editData.isActive,
      })
    } else {
      reset({
        roleCode: '',
        roleName: '',
        description: '',
        isActive: true,
      })
    }
  }, [editData, reset])

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateRole.mutateAsync({ id: editData.id, data })
      } else {
        await createRole.mutateAsync(data)
      }
      onClose()
      reset()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const isLoading = createRole.isPending || updateRole.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới'}
      description={isEdit ? 'Cập nhật thông tin vai trò trong hệ thống' : 'Thêm vai trò mới vào hệ thống quản lý phân quyền'}
      size="md"
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
        <Input
          label="Mã vai trò"
          placeholder="VD: WH_MANAGER"
          disabled={isEdit}
          error={errors.roleCode?.message}
          required
          {...register('roleCode')}
        />

        <Input
          label="Tên vai trò"
          placeholder="VD: Quản lý kho"
          error={errors.roleName?.message}
          required
          {...register('roleName')}
        />

        <Textarea
          label="Mô tả"
          placeholder="Mô tả ngắn gọn về vai trò này..."
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />

        <Switch
          label="Trạng thái hoạt động"
          description="Vai trò đang hoạt động có thể được gán cho người dùng"
          checked={watch('isActive')}
          onChange={(value) => setValue('isActive', value)}
        />
      </form>
    </Modal>
  )
}
