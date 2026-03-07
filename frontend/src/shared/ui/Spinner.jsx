import { cn } from '@shared/lib/cn'
import { Loader2 } from 'lucide-react'

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
}

export function Spinner({ size = 'md', className }) {
  return (
    <Loader2 className={cn('animate-spin text-primary-500', sizes[size], className)} />
  )
}

export function PageLoader({ message = 'Đang tải...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Spinner size="lg" />
      <p className="text-navy-600">{message}</p>
    </div>
  )
}
