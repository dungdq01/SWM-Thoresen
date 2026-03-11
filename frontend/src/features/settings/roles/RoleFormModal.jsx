import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, Input, Textarea, Switch, Button } from '@shared/ui'
import { useCreateRole, useUpdateRole } from '@domains/auth'

const roleSchema = z.object({
  roleCode: z.string().min(1, 'Mã vai trò là bắt buộc').max(50, 'Tối đa 50 ký tự'),
  roleName: z.string().min(1, 'Tên vai trò là bắt buộc').max(150, 'Tối đa 150 ký tự'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
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
        // Remove isActive for create - backend doesn't accept it
        const { isActive, ...createData } = data
        await createRole.mutateAsync(createData)
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
          error={errors.roleCode?.message}
          required
          disabled={isEdit}
          {...register('roleCode')}
        />
        {isEdit && (
          <p className="text-xs text-slate-500 -mt-2">Mã vai trò không thể thay đổi sau khi tạo</p>
        )}

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

        {isEdit && (
          <Switch
            label="Trạng thái hoạt động"
            description="Vai trò đang hoạt động có thể được gán cho người dùng"
            checked={watch('isActive')}
            onChange={(value) => setValue('isActive', value)}
          />
        )}
      </form>
    </Modal>
  )
}
