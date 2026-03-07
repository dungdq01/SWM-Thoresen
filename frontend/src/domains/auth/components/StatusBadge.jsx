import { Badge } from '@shared/ui'

export function ActiveStatusBadge({ isActive }) {
  return (
    <Badge variant={isActive ? 'success' : 'default'} dot>
      {isActive ? 'Đang hoạt động' : 'Ngưng hoạt động'}
    </Badge>
  )
}

export function PermissionEffectBadge({ effect }) {
  return (
    <Badge variant={effect === 'ALLOW' ? 'success' : 'danger'}>
      {effect === 'ALLOW' ? 'Cho phép' : 'Từ chối'}
    </Badge>
  )
}

export function SeverityBadge({ severity }) {
  const variants = {
    LOW: 'info',
    MEDIUM: 'warning',
    HIGH: 'danger',
    CRITICAL: 'danger',
  }
  const labels = {
    LOW: 'Thấp',
    MEDIUM: 'Trung bình',
    HIGH: 'Cao',
    CRITICAL: 'Nghiêm trọng',
  }
  return (
    <Badge variant={variants[severity] || 'default'} dot>
      {labels[severity] || severity}
    </Badge>
  )
}

export function RuleStatusBadge({ status }) {
  const variants = {
    DRAFT: 'default',
    ACTIVE: 'success',
    DEPRECATED: 'warning',
  }
  const labels = {
    DRAFT: 'Nháp',
    ACTIVE: 'Đang áp dụng',
    DEPRECATED: 'Ngưng sử dụng',
  }
  return (
    <Badge variant={variants[status] || 'default'}>
      {labels[status] || status}
    </Badge>
  )
}

export function ResolvedBadge({ isResolved }) {
  return (
    <Badge variant={isResolved ? 'success' : 'warning'} dot>
      {isResolved ? 'Đã xử lý' : 'Chưa xử lý'}
    </Badge>
  )
}
