import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, Input, Switch, Button } from '@shared/ui'
import { useCreateUser, useUpdateUser } from '@domains/auth/hooks/useUsers'
import { useRoles } from '@domains/auth'

const createSchema = z.object({
  username: z.string().min(3, 'Tối thiểu 3 ký tự').max(50).regex(/^[a-zA-Z0-9_]+$/, 'Chỉ chữ, số và dấu gạch dưới'),
  fullName: z.string().min(2, 'Tối thiểu 2 ký tự').max(150),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  password: z.string().min(8, 'Tối thiểu 8 ký tự'),
  roleCode: z.string().optional(),
  mustChangePassword: z.boolean().optional(),
})

const editSchema = z.object({
  fullName: z.string().min(2, 'Tối thiểu 2 ký tự').max(150),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  isActive: z.boolean().optional(),
})

export function UserFormModal({ data: editData, onClose }) {
  const isEdit = !!editData

  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const { data: roles = [] } = useRoles()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit
      ? { fullName: editData.fullName || '', email: editData.email || '', isActive: editData.isActive }
      : { username: '', fullName: '', email: '', password: '', roleCode: '', mustChangePassword: true },
  })

  useEffect(() => {
    if (editData) {
      reset({ fullName: editData.fullName || '', email: editData.email || '', isActive: editData.isActive })
    } else {
      reset({ username: '', fullName: '', email: '', password: '', roleCode: '', mustChangePassword: true })
    }
  }, [editData, reset])

  const onSubmit = async (formData) => {
    try {
      if (isEdit) {
        await updateUser.mutateAsync({ id: editData.id, ...formData })
      } else {
        const payload = { ...formData }
        if (!payload.email) delete payload.email
        if (!payload.roleCode) delete payload.roleCode
        await createUser.mutateAsync(payload)
      }
      onClose()
    } catch (error) {
      // handled by mutation
    }
  }

  const isLoading = createUser.isPending || updateUser.isPending

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}
      description={isEdit ? 'Cập nhật thông tin tài khoản người dùng' : 'Tạo tài khoản mới và gán vai trò'}
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
        {!isEdit && (
          <Input
            label="Tên đăng nhập"
            placeholder="VD: wh_manager"
            error={errors.username?.message}
            required
            {...register('username')}
          />
        )}

        <Input
          label="Họ và tên"
          placeholder="VD: Nguyễn Văn A"
          error={errors.fullName?.message}
          required
          {...register('fullName')}
        />

        <Input
          label="Email"
          placeholder="VD: user@swms.local"
          error={errors.email?.message}
          {...register('email')}
        />

        {!isEdit && (
          <>
            <Input
              label="Mật khẩu"
              type="password"
              placeholder="Tối thiểu 8 ký tự"
              error={errors.password?.message}
              required
              {...register('password')}
            />

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                Vai trò
              </label>
              <select
                {...register('roleCode')}
                className="w-full h-10 rounded-xl border px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ice/40"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-subtle)',
                  color: 'var(--color-text)',
                }}
              >
                <option value="">— Không gán vai trò —</option>
                {roles.map((r) => (
                  <option key={r.roleCode} value={r.roleCode}>
                    {r.roleName} ({r.roleCode})
                  </option>
                ))}
              </select>
            </div>

            <Switch
              label="Yêu cầu đổi mật khẩu lần đầu"
              description="Người dùng phải đổi mật khẩu khi đăng nhập lần đầu tiên"
              checked={watch('mustChangePassword')}
              onChange={(value) => setValue('mustChangePassword', value)}
            />
          </>
        )}

        {isEdit && (
          <Switch
            label="Trạng thái hoạt động"
            description="Tài khoản bị vô hiệu sẽ không thể đăng nhập"
            checked={watch('isActive')}
            onChange={(value) => setValue('isActive', value)}
          />
        )}
      </form>
    </Modal>
  )
}
