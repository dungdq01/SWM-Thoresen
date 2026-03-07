export const ROLE_STATUS = {
  ACTIVE: true,
  INACTIVE: false,
}

export const PERMISSION_EFFECT = {
  ALLOW: 'ALLOW',
  DENY: 'DENY',
}

export const REASON_CODE_CATEGORIES = [
  { value: 'INBOUND', label: 'Nhập kho' },
  { value: 'OUTBOUND', label: 'Xuất kho' },
  { value: 'ADJUSTMENT', label: 'Điều chỉnh' },
  { value: 'INVENTORY', label: 'Tồn kho' },
  { value: 'GENERAL', label: 'Chung' },
]

export const REASON_CODE_DOMAINS = [
  { value: 'FOUNDATION', label: 'Foundation' },
  { value: 'INBOUND', label: 'Inbound' },
  { value: 'OUTBOUND', label: 'Outbound' },
  { value: 'INVENTORY', label: 'Inventory' },
  { value: 'BILLING', label: 'Billing' },
]

export const SEQUENCE_SCOPE_TYPES = [
  { value: 'GLOBAL', label: 'Toàn hệ thống' },
  { value: 'PER_WAREHOUSE', label: 'Theo kho' },
  { value: 'PER_OWNER', label: 'Theo chủ hàng' },
]

export const SEQUENCE_RESET_POLICIES = [
  { value: 'NEVER', label: 'Không reset' },
  { value: 'DAILY', label: 'Hàng ngày' },
  { value: 'MONTHLY', label: 'Hàng tháng' },
  { value: 'YEARLY', label: 'Hàng năm' },
]

export const RULE_STATUS = [
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'ACTIVE', label: 'Đang áp dụng' },
  { value: 'DEPRECATED', label: 'Ngưng sử dụng' },
]

export const RULE_DOMAINS = [
  { value: 'FOUNDATION', label: 'Foundation' },
  { value: 'INBOUND', label: 'Inbound' },
  { value: 'OUTBOUND', label: 'Outbound' },
  { value: 'INVENTORY', label: 'Inventory' },
  { value: 'BILLING', label: 'Billing' },
]

export const EXCEPTION_SEVERITY = [
  { value: 'LOW', label: 'Thấp', color: 'info' },
  { value: 'MEDIUM', label: 'Trung bình', color: 'warning' },
  { value: 'HIGH', label: 'Cao', color: 'danger' },
  { value: 'CRITICAL', label: 'Nghiêm trọng', color: 'danger' },
]

export const AUDIT_ACTIONS = [
  { value: 'CREATE', label: 'Tạo mới' },
  { value: 'UPDATE', label: 'Cập nhật' },
  { value: 'DELETE', label: 'Xóa' },
  { value: 'VIEW', label: 'Xem' },
]
