/**
 * Chuyển đổi lỗi API (validation, business logic) sang tiếng Việt dễ đọc.
 * Xử lý cả chuỗi đơn lẫn mảng lỗi từ class-validator / NestJS.
 */

// ── Field name map ────────────────────────────────────────────────────────────
const FIELD_NAMES = {
  // Common
  id: 'ID',
  notes: 'ghi chú',
  status: 'trạng thái',
  rowVersion: 'phiên bản bản ghi',
  sourceApp: 'ứng dụng nguồn',
  // Receipt / Lines
  poId: 'mã đơn mua hàng',
  ownerId: 'chủ hàng',
  vendorId: 'nhà cung cấp',
  warehouseId: 'kho',
  vehicleNumber: 'biển số xe',
  blNumber: 'số vận đơn',
  receivingLocationId: 'vị trí nhận hàng',
  expectedQty: 'số lượng dự kiến',
  receivedQty: 'số lượng nhận',
  uomId: 'đơn vị tính',
  itemId: 'mặt hàng',
  cargoForm: 'dạng hàng',
  unitPrice: 'đơn giá',
  // Master data
  statusCode: 'mã trạng thái',
  description: 'mô tả',
  isActive: 'trạng thái hoạt động',
  uomCode: 'mã ĐVT',
  uomClass: 'nhóm ĐVT',
  locationCode: 'mã vị trí',
  locationType: 'loại vị trí',
  warehouseCode: 'mã kho',
  zoneId: 'zone',
  vehicleTypeCode: 'mã loại xe',
  vehicleTypeName: 'tên loại xe',
  category: 'danh mục',
  maxPayloadKg: 'tải trọng tối đa',
  reason: 'lý do',
  // Outbound
  shipmentId: 'lô hàng',
  soId: 'đơn bán hàng',
  customerId: 'khách hàng',
  // Inventory
  quantity: 'số lượng',
  locationId: 'vị trí',
  inventoryStatusId: 'trạng thái tồn kho',
}

// ── Enum value map ────────────────────────────────────────────────────────────
const ENUM_VALUES = {
  // Cargo forms
  BULK: 'Hàng rời',
  BAGGED_25KG: 'Bao 25kg',
  BAGGED_40KG: 'Bao 40kg',
  BAGGED_50KG: 'Bao 50kg',
  JUMBO: 'Jumbo bag',
  PACKAGING: 'Bao bì',
  CONTAINER: 'Container',
  DRUM: 'Thùng phuy',
  PALLET: 'Pallet',
  OTHER: 'Khác',
  // Vehicle categories
  TRUCK: 'Xe tải',
  TRAILER: 'Xe đầu kéo',
  CONTAINER_TRUCK: 'Xe container',
  FORKLIFT: 'Xe nâng',
  CRANE: 'Cẩu',
  VESSEL: 'Tàu biển',
  BARGE: 'Sà lan',
  // Statuses
  DRAFT: 'Nháp',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  CLOSED: 'Đã đóng',
  // Source app
  WEB: 'Web',
  MOBILE: 'Mobile',
  API: 'API',
  // UOM class
  WEIGHT: 'Khối lượng',
  VOLUME: 'Thể tích',
  QUANTITY: 'Số lượng',
  LENGTH: 'Chiều dài',
  AREA: 'Diện tích',
}

// ── Business error code map ───────────────────────────────────────────────────
const BUSINESS_ERRORS = {
  // Generic
  'not found': 'Không tìm thấy dữ liệu',
  'already exists': 'Dữ liệu đã tồn tại',
  'conflict': 'Xung đột dữ liệu, vui lòng tải lại trang',
  'row version': 'Dữ liệu đã được chỉnh sửa bởi người khác, vui lòng tải lại',
  'optimistic': 'Dữ liệu đã được chỉnh sửa bởi người khác, vui lòng tải lại',
  'unauthorized': 'Bạn không có quyền thực hiện thao tác này',
  'forbidden': 'Truy cập bị từ chối',
  'timeout': 'Yêu cầu hết thời gian, vui lòng thử lại',
  'network': 'Lỗi kết nối mạng',
  // Inbound
  'po is not confirmed': 'Đơn mua hàng chưa được xác nhận',
  'receipt already': 'Phiếu nhập đã tồn tại hoặc đã xử lý',
  'invalid weight': 'Trọng lượng không hợp lệ',
  'weigh-in': 'Chưa thực hiện cân vào',
  'weigh-out': 'Chưa thực hiện cân ra',
  // Inventory
  'insufficient': 'Số lượng tồn kho không đủ',
  'location occupied': 'Vị trí đã được sử dụng',
  'location blocked': 'Vị trí đang bị khóa',
  'system locked': 'Dữ liệu đã bị khóa bởi hệ thống',
  // Deactivate guard — inventory still exists
  'cannot deactivate owner because inventory still exists': 'Không thể ngừng hoạt động chủ hàng vì vẫn còn tồn kho',
  'cannot deactivate item because inventory still exists': 'Không thể ngừng hoạt động mặt hàng vì vẫn còn tồn kho',
  'cannot deactivate location because stock still exists': 'Không thể ngừng hoạt động vị trí vì vẫn còn hàng tồn',
  'cannot deactivate zone because inventory still exists': 'Không thể ngừng hoạt động zone vì vẫn còn tồn kho tại các vị trí bên trong',
  'cannot deactivate warehouse because inventory still exists': 'Không thể ngừng hoạt động kho vì vẫn còn tồn kho tại các vị trí bên trong',
  // Deactivate guard — active children
  'cannot deactivate zone with active locations': 'Không thể ngừng hoạt động zone vì vẫn còn vị trí đang hoạt động',
  'cannot deactivate warehouse with active zones': 'Không thể ngừng hoạt động kho vì vẫn còn zone đang hoạt động',
  // Owner-Warehouse Access
  'owner does not have access': 'Chủ hàng không có quyền truy cập kho này',
}

// ── Validation pattern translators ───────────────────────────────────────────
function translateValidationMessage(raw) {
  if (!raw || typeof raw !== 'string') return null

  // "property X should not exist"
  if (/should not exist/i.test(raw)) return null  // suppress noisy system fields

  // "X must be a UUID"
  const uuidMatch = raw.match(/^(\w+)\s+must be a UUID/i)
  if (uuidMatch) {
    const field = FIELD_NAMES[uuidMatch[1]] || uuidMatch[1]
    return `${field} không hợp lệ (phải là UUID)`
  }

  // "X must be a positive number" / "must be a number"
  const numMatch = raw.match(/^(\w+)\s+must be a (positive\s+)?number/i)
  if (numMatch) {
    const field = FIELD_NAMES[numMatch[1]] || numMatch[1]
    return `${field} phải là số${numMatch[2] ? ' dương' : ''}`
  }

  // "X must be a string"
  const strMatch = raw.match(/^(\w+)\s+must be a string/i)
  if (strMatch) {
    const field = FIELD_NAMES[strMatch[1]] || strMatch[1]
    return `${field} phải là chuỗi văn bản`
  }

  // "X must be one of the following values: A, B, C"
  const enumMatch = raw.match(/^(\w+)\s+must be one of the following values:\s*(.+)$/i)
  if (enumMatch) {
    const field = FIELD_NAMES[enumMatch[1]] || enumMatch[1]
    const values = enumMatch[2]
      .split(',')
      .map((v) => v.trim())
      .map((v) => ENUM_VALUES[v] || v)
      .join(', ')
    return `${field} phải là một trong: ${values}`
  }

  // "lines.N.fieldName must be ..."  — nested array field
  const nestedMatch = raw.match(/^lines\.(\d+)\.(\w+)\s+(.+)$/i)
  if (nestedMatch) {
    const lineNum = Number(nestedMatch[1]) + 1
    const field = FIELD_NAMES[nestedMatch[2]] || nestedMatch[2]
    const rest = translateValidationMessage(`${nestedMatch[2]} ${nestedMatch[3]}`)
    return rest
      ? `Dòng ${lineNum}: ${rest}`
      : `Dòng ${lineNum}: ${field} không hợp lệ`
  }

  // "X must not be empty" / "X should not be empty"
  const emptyMatch = raw.match(/^(\w+)\s+(must|should) not be empty/i)
  if (emptyMatch) {
    const field = FIELD_NAMES[emptyMatch[1]] || emptyMatch[1]
    return `${field} không được để trống`
  }

  // "X must be longer than or equal to N characters"
  const minLenMatch = raw.match(/^(\w+)\s+must be longer than or equal to (\d+)/i)
  if (minLenMatch) {
    const field = FIELD_NAMES[minLenMatch[1]] || minLenMatch[1]
    return `${field} phải có ít nhất ${minLenMatch[2]} ký tự`
  }

  // "X must be shorter than or equal to N characters"
  const maxLenMatch = raw.match(/^(\w+)\s+must be shorter than or equal to (\d+)/i)
  if (maxLenMatch) {
    const field = FIELD_NAMES[maxLenMatch[1]] || maxLenMatch[1]
    return `${field} không được vượt quá ${maxLenMatch[2]} ký tự`
  }

  // "X must be a boolean"
  const boolMatch = raw.match(/^(\w+)\s+must be a boolean/i)
  if (boolMatch) {
    const field = FIELD_NAMES[boolMatch[1]] || boolMatch[1]
    return `${field} phải là true/false`
  }

  // "X must conform to ... constraints"
  if (/must be a number conforming to the specified constraints/i.test(raw)) {
    const field = raw.split(' ')[0]
    return `${FIELD_NAMES[field] || field} phải là số hợp lệ`
  }

  return null
}

function translateBusinessMessage(raw) {
  if (!raw || typeof raw !== 'string') return null
  const lower = raw.toLowerCase()
  for (const [key, msg] of Object.entries(BUSINESS_ERRORS)) {
    if (lower.includes(key)) return msg
  }
  return null
}

// ── Main export ───────────────────────────────────────────────────────────────
export function parseApiError(errorData) {
  if (!errorData) return 'Đã xảy ra lỗi không xác định'

  const err = errorData?.error || errorData
  const rawMessage = err?.message || ''
  const statusCode = err?.statusCode || errorData?.statusCode

  // Array of validation messages (NestJS class-validator)
  if (Array.isArray(rawMessage)) {
    const translated = rawMessage
      .map(translateValidationMessage)
      .filter(Boolean)
    return translated.length > 0
      ? translated.join('\n')
      : 'Dữ liệu nhập không hợp lệ'
  }

  // Single string message
  if (typeof rawMessage === 'string') {
    // Try business error first
    const business = translateBusinessMessage(rawMessage)
    if (business) return business

    // Try validation pattern
    const validation = translateValidationMessage(rawMessage)
    if (validation) return validation

    // HTTP status fallbacks
    if (statusCode === 400) return rawMessage || 'Dữ liệu nhập không hợp lệ'
    if (statusCode === 401) return 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại'
    if (statusCode === 403) return 'Bạn không có quyền thực hiện thao tác này'
    if (statusCode === 404) return 'Không tìm thấy dữ liệu'
    if (statusCode === 409) return 'Xung đột dữ liệu, vui lòng tải lại trang'
    if (statusCode >= 500) return 'Lỗi máy chủ, vui lòng thử lại sau'

    // Return raw if it's already in Vietnamese (contains Vietnamese chars)
    if (/[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(rawMessage)) {
      return rawMessage
    }
  }

  return 'Đã xảy ra lỗi, vui lòng thử lại'
}
