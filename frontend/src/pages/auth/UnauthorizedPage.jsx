import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@shared/ui'

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <ShieldAlert className="w-20 h-20 text-red-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Không có quyền truy cập</h1>
          <p className="text-moon-300">
            Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
        <Link to="/app">
          <Button variant="accent" icon={<ArrowLeft className="w-4 h-4" />}>
            Về trang chủ
          </Button>
        </Link>
      </div>
    </div>
  )
}
