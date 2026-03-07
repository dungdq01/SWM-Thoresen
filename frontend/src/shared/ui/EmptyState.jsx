import { cn } from '@shared/lib/cn'
import { Inbox } from 'lucide-react'

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Không có dữ liệu',
  description,
  action,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      <div className="w-16 h-16 rounded-2xl bg-navy-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-navy-400" />
      </div>
      <h3 className="text-lg font-semibold text-navy-900 mb-1">{title}</h3>
      {description && (
        <p className="text-navy-500 text-center max-w-sm mb-4">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
