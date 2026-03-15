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
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--color-bg-subtle)' }}
      >
        <Icon className="w-8 h-8" style={{ color: 'var(--color-text-muted)' }} />
      </div>
      <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{title}</h3>
      {description && (
        <p className="text-center max-w-sm mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
