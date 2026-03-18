import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, Input, Switch, Button } from '@shared/ui'
import { useResetUserPassword } from '@domains/auth/hooks/useUsers'

const schema = z.object({
  newPassword: z.string().min(8, 'Tối thiểu 8 ký tự'),
  mustChangePassword: z.boolean().optional(),
})

export function ResetPasswordModal({ user, onClose }) {
  const resetPw = useResetUserPassword()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', mustChangePassword: true },
  })

  const onSubmit = async (data) => {
    try {
      await resetPw.mutateAsync({ id: user.id, ...data })
      onClose()
    } catch (error) {
      // handled by mutation
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Đặt lại mật khẩu"
      description={`Đặt lại mật khẩu cho tài khoản "${user?.username}"`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={resetPw.isPending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={resetPw.isPending}>
            {resetPw.isPending ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <div
          className="rounded-xl px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)' }}
        >
          <span style={{ color: 'var(--color-text-muted)' }}>Tài khoản: </span>
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{user?.fullName}</span>
          <span style={{ color: 'var(--color-text-muted)' }}> ({user?.username})</span>
        </div>

        <Input
          label="Mật khẩu mới"
          type="password"
          placeholder="Tối thiểu 8 ký tự"
          error={errors.newPassword?.message}
          required
          {...register('newPassword')}
        />

        <Switch
          label="Yêu cầu đổi mật khẩu lần đầu"
          description="Người dùng phải đổi mật khẩu khi đăng nhập lần tiếp theo"
          checked={watch('mustChangePassword')}
          onChange={(value) => setValue('mustChangePassword', value)}
        />
      </form>
    </Modal>
  )
}
