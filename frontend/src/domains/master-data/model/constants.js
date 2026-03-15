// Owner constants
export const OWNER_GROUPS = [
  { value: 'LOCAL', label: 'Nội địa' },
  { value: 'FOREIGN', label: 'Nước ngoài' },
]

export const OWNER_TYPES = [
  { value: 'DIRECT', label: 'Trực tiếp' },
  { value: 'CONSIGNED', label: 'Ký gửi' },
  { value: 'OTHER', label: 'Khác' },
]

// Vendor constants
export const SUPPLIER_GROUPS = [
  { value: 'DOMESTIC', label: 'Nội địa' },
  { value: 'OVERSEAS', label: 'Nước ngoài' },
  { value: 'VESSEL_AGENT', label: 'Đại lý tàu' },
  { value: 'TRADER', label: 'Thương nhân' },
]

// Customer constants
export const CUSTOMER_GROUPS = [
  { value: 'CORPORATE', label: 'Doanh nghiệp' },
  { value: 'INDIVIDUAL', label: 'Cá nhân' },
]

export const CUSTOMER_TYPES = [
  { value: 'BUYER', label: 'Người mua' },
  { value: 'CONSIGNEE', label: 'Người nhận hàng' },
  { value: 'SHIPPER', label: 'Người gửi hàng' },
]

// Item constants
export const CARGO_FORMS = [
  { value: 'BULK', label: 'Hàng rời' },
  { value: 'BAGGED_25KG', label: 'Đóng bao 25kg' },
  { value: 'BAGGED_40KG', label: 'Đóng bao 40kg' },
  { value: 'BAGGED_50KG', label: 'Đóng bao 50kg' },
  { value: 'JUMBO', label: 'Jumbo' },
  { value: 'PACKAGING', label: 'Bao bì' },
  { value: 'CONTAINER', label: 'Container' },
  { value: 'DRUM', label: 'Thùng' },
  { value: 'PALLET', label: 'Pallet' },
  { value: 'OTHER', label: 'Khác' },
]

export const PRODUCT_GROUPS = [
  { value: 'AGRICULTURAL', label: 'Nông sản' },
  { value: 'FERTILIZER', label: 'Phân bón' },
  { value: 'CHEMICAL', label: 'Hóa chất' },
  { value: 'STEEL', label: 'Thép' },
  { value: 'GENERAL', label: 'Hàng tổng hợp' },
]

// Warehouse constants
export const WAREHOUSE_TYPES = [
  { value: 'COVERED', label: 'Kho có mái che' },
  { value: 'OPEN_YARD', label: 'Bãi hở' },
]

// Zone constants
export const ZONE_TYPES = [
  { value: 'RECEIVING', label: 'Khu vực nhận hàng' },
  { value: 'STORAGE', label: 'Khu vực lưu trữ' },
  { value: 'STAGING', label: 'Khu vực tập kết' },
  { value: 'SHIPPING', label: 'Khu vực xuất hàng' },
  { value: 'QC', label: 'Khu vực kiểm định' },
  { value: 'DAMAGED', label: 'Khu vực hàng hỏng' },
  { value: 'RETURNS', label: 'Khu vực hàng trả' },
]

// Location constants
export const LOCATION_TYPES = [
  { value: 'RECEIVING', label: 'Khu vực nhận hàng' },
  { value: 'STORAGE', label: 'Khu vực lưu trữ' },
  { value: 'STAGING', label: 'Khu vực tập kết' },
  { value: 'SHIPPING', label: 'Khu vực xuất hàng' },
  { value: 'QC', label: 'Khu vực kiểm định' },
  { value: 'DAMAGED', label: 'Khu vực hàng hỏng' },
  { value: 'RETURNS', label: 'Khu vực hàng trả' },
  { value: 'VIRTUAL', label: 'Vị trí ảo' },
]

export const LOCATION_PROFILES = [
  { value: 'STANDARD', label: 'Tiêu chuẩn' },
  { value: 'BULK', label: 'Hàng rời' },
  { value: 'HEAVY', label: 'Hàng nặng' },
]

export const LOCATION_STATUSES = [
  { value: 'AVAILABLE', label: 'Sẵn sàng', color: 'success' },
  { value: 'OCCUPIED', label: 'Đã sử dụng', color: 'warning' },
  { value: 'BLOCKED', label: 'Đã khóa', color: 'error' },
  { value: 'MAINTENANCE', label: 'Bảo trì', color: 'neutral' },
]

// UOM constants
export const UOM_CLASSES = [
  { value: 'WEIGHT', label: 'Khối lượng' },
  { value: 'VOLUME', label: 'Thể tích' },
  { value: 'QUANTITY', label: 'Số lượng' },
  { value: 'LENGTH', label: 'Chiều dài' },
  { value: 'AREA', label: 'Diện tích' },
]

// Vehicle Type constants
export const VEHICLE_CATEGORIES = [
  { value: 'TRUCK', label: 'Xe tải' },
  { value: 'TRAILER', label: 'Xe đầu kéo' },
  { value: 'CONTAINER_TRUCK', label: 'Xe container' },
  { value: 'FORKLIFT', label: 'Xe nâng' },
  { value: 'CRANE', label: 'Cẩu' },
  { value: 'VESSEL', label: 'Tàu biển' },
  { value: 'BARGE', label: 'Sà lan' },
  { value: 'CONTAINER', label: 'Container' },
]

// Status helper
export const getStatusConfig = (isActive) => ({
  label: isActive ? 'Hoạt động' : 'Ngừng hoạt động',
  variant: isActive ? 'success' : 'neutral',
})

// Query keys for React Query
export const MASTER_DATA_QUERY_KEYS = {
  owners: ['master-data', 'owners'],
  ownerDetail: (id) => ['master-data', 'owners', id],
  vendors: ['master-data', 'vendors'],
  vendorDetail: (id) => ['master-data', 'vendors', id],
  customers: ['master-data', 'customers'],
  customerDetail: (id) => ['master-data', 'customers', id],
  items: ['master-data', 'items'],
  itemDetail: (id) => ['master-data', 'items', id],
  warehouses: ['master-data', 'warehouses'],
  warehouseDetail: (id) => ['master-data', 'warehouses', id],
  zones: ['master-data', 'zones'],
  zoneDetail: (id) => ['master-data', 'zones', id],
  locations: ['master-data', 'locations'],
  locationDetail: (id) => ['master-data', 'locations', id],
  uoms: ['master-data', 'uoms'],
  uomDetail: (id) => ['master-data', 'uoms', id],
  uomConversions: ['master-data', 'uom-conversions'],
  uomConversionDetail: (id) => ['master-data', 'uom-conversions', id],
  vehicleTypes: ['master-data', 'vehicle-types'],
  vehicleTypeDetail: (id) => ['master-data', 'vehicle-types', id],
  inventoryStatuses: ['master-data', 'inventory-statuses'],
  // Lookups
  lookupOwners: ['master-data', 'lookups', 'owners'],
  lookupVendors: ['master-data', 'lookups', 'vendors'],
  lookupCustomers: ['master-data', 'lookups', 'customers'],
  lookupItems: ['master-data', 'lookups', 'items'],
  lookupWarehouses: ['master-data', 'lookups', 'warehouses'],
  lookupZones: (warehouseId) => ['master-data', 'lookups', 'zones', warehouseId],
  lookupLocations: (warehouseId, zoneId) => ['master-data', 'lookups', 'locations', warehouseId, zoneId],
  lookupUoms: ['master-data', 'lookups', 'uoms'],
  lookupVehicleTypes: ['master-data', 'lookups', 'vehicle-types'],
  lookupInventoryStatuses: ['master-data', 'lookups', 'inventory-statuses'],
}
