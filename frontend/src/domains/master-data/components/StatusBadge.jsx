import { Badge } from '@shared/ui'

export function StatusBadge({ isActive }) {
  return (
    <Badge variant={isActive ? 'success' : 'neutral'}>
      {isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
    </Badge>
  )
}

export function OwnerGroupBadge({ group }) {
  const config = {
    LOCAL: { label: 'Nội địa', variant: 'primary' },
    FOREIGN: { label: 'Nước ngoài', variant: 'info' },
  }
  const { label, variant } = config[group] || { label: group, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}

export function CargoFormBadge({ cargoForm }) {
  const config = {
    BULK: { label: 'Hàng rời', variant: 'warning' },
    BAGGED: { label: 'Đóng bao', variant: 'info' },
    CONTAINERIZED: { label: 'Container', variant: 'primary' },
    LIQUID: { label: 'Lỏng', variant: 'neutral' },
  }
  const { label, variant } = config[cargoForm] || { label: cargoForm, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}

export function WarehouseTypeBadge({ type }) {
  const config = {
    COVERED: { label: 'Có mái che', variant: 'primary' },
    OPEN: { label: 'Bãi hở', variant: 'warning' },
    COLD: { label: 'Kho lạnh', variant: 'info' },
    HAZMAT: { label: 'Hàng nguy hiểm', variant: 'error' },
  }
  const { label, variant } = config[type] || { label: type, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}

export function ZoneTypeBadge({ type }) {
  const config = {
    BULK_STORAGE: { label: 'Lưu trữ hàng rời', variant: 'warning' },
    BAGGED_STORAGE: { label: 'Lưu trữ hàng bao', variant: 'info' },
    CONTAINER_YARD: { label: 'Bãi container', variant: 'primary' },
    RECEIVING: { label: 'Nhận hàng', variant: 'success' },
    SHIPPING: { label: 'Xuất hàng', variant: 'error' },
    STAGING: { label: 'Tập kết', variant: 'neutral' },
  }
  const { label, variant } = config[type] || { label: type, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}

export function LocationStatusBadge({ status }) {
  const config = {
    AVAILABLE: { label: 'Sẵn sàng', variant: 'success' },
    OCCUPIED: { label: 'Đã sử dụng', variant: 'warning' },
    BLOCKED: { label: 'Đã khóa', variant: 'error' },
    MAINTENANCE: { label: 'Bảo trì', variant: 'neutral' },
  }
  const { label, variant } = config[status] || { label: status, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}

export function InventoryStatusBadge({ statusCode, isAllocatable }) {
  const config = {
    AVAILABLE: { label: 'Sẵn sàng', variant: 'success' },
    DAMAGED: { label: 'Hư hỏng', variant: 'error' },
    BLOCKED: { label: 'Đã khóa', variant: 'warning' },
    IN_TRANSIT: { label: 'Đang vận chuyển', variant: 'info' },
  }
  const { label, variant } = config[statusCode] || { label: statusCode, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}
