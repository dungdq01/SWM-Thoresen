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
    LOCAL: { label: 'Nội địa', variant: 'local' },
    FOREIGN: { label: 'Nước ngoài', variant: 'foreign' },
  }
  const { label, variant } = config[group] || { label: group, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}

export function CargoFormBadge({ cargoForm }) {
  const config = {
    BULK:        { label: 'Hàng rời',      variant: 'warning' },
    BAGGED_25KG: { label: 'Bao 25kg',      variant: 'info' },
    BAGGED_40KG: { label: 'Bao 40kg',      variant: 'info' },
    BAGGED_50KG: { label: 'Bao 50kg',      variant: 'info' },
    JUMBO:       { label: 'Jumbo bag',      variant: 'primary' },
    PACKAGING:   { label: 'Bao bì',        variant: 'foreign' },
    CONTAINER:   { label: 'Container',     variant: 'local' },
    DRUM:        { label: 'Thùng phuy',    variant: 'danger' },
    PALLET:      { label: 'Pallet',        variant: 'success' },
    OTHER:       { label: 'Khác',          variant: 'neutral' },
  }
  const { label, variant } = config[cargoForm] || { label: cargoForm, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}

export function WarehouseTypeBadge({ type }) {
  const config = {
    COVERED:   { label: 'Có mái che', variant: 'primary' },
    OPEN_YARD: { label: 'Bãi hở',     variant: 'warning' },
  }
  const { label, variant } = config[type] || { label: type, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}

export function ZoneTypeBadge({ type }) {
  const config = {
    RECEIVING: { label: 'Nhận hàng',   variant: 'success' },
    STORAGE:   { label: 'Lưu trữ',     variant: 'info' },
    STAGING:   { label: 'Tập kết',     variant: 'warning' },
    SHIPPING:  { label: 'Xuất hàng',   variant: 'danger' },
    QC:        { label: 'Kiểm định',   variant: 'primary' },
    DAMAGED:   { label: 'Hàng hỏng',   variant: 'neutral' },
    RETURNS:   { label: 'Hàng trả',    variant: 'foreign' },
  }
  const { label, variant } = config[type] || { label: type, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}

export function LocationTypeBadge({ type }) {
  const config = {
    RECEIVING: { label: 'Nhận hàng',   variant: 'success' },
    STORAGE:   { label: 'Lưu trữ',     variant: 'info' },
    STAGING:   { label: 'Tập kết',     variant: 'warning' },
    SHIPPING:  { label: 'Xuất hàng',   variant: 'danger' },
    QC:        { label: 'Kiểm định',   variant: 'primary' },
    DAMAGED:   { label: 'Hàng hỏng',   variant: 'neutral' },
    RETURNS:   { label: 'Hàng trả',    variant: 'foreign' },
    VIRTUAL:   { label: 'Vị trí ảo',  variant: 'draft' },
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
    AVAILABLE:  { label: 'Sẵn sàng',       variant: 'success' },
    DAMAGED:    { label: 'Hư hỏng',         variant: 'error' },
    BLOCKED:    { label: 'Đã khóa',         variant: 'warning' },
    IN_TRANSIT: { label: 'Đang vận chuyển', variant: 'info' },
    QC_HOLD:    { label: 'Chờ kiểm định',   variant: 'primary' },
    EXPIRED:    { label: 'Hết hạn',         variant: 'danger' },
    RESERVED:   { label: 'Đã đặt trước',    variant: 'foreign' },
    DISPUTE:    { label: 'Tranh chấp',      variant: 'local' },
  }
  const { label, variant } = config[statusCode] || { label: statusCode, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}
