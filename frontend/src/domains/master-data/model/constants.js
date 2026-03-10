// Owner constants
export const OWNER_GROUPS = [
  { value: 'LOCAL', label: 'Nội địa' },
  { value: 'FOREIGN', label: 'Nước ngoài' },
]

export const OWNER_TYPES = [
  { value: 'DOMESTIC', label: 'Trong nước' },
  { value: 'EXPORT', label: 'Xuất khẩu' },
  { value: 'IMPORT', label: 'Nhập khẩu' },
]

// Vendor constants
export const SUPPLIER_GROUPS = [
  { value: 'VESSEL', label: 'Tàu' },
  { value: 'TRUCK', label: 'Xe tải' },
  { value: 'BARGE', label: 'Sà lan' },
  { value: 'OTHER', label: 'Khác' },
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
  { value: 'BAGGED', label: 'Đóng bao' },
  { value: 'CONTAINERIZED', label: 'Container' },
  { value: 'LIQUID', label: 'Lỏng' },
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
  { value: 'OPEN', label: 'Bãi hở' },
  { value: 'COLD', label: 'Kho lạnh' },
  { value: 'HAZMAT', label: 'Kho hàng nguy hiểm' },
]

// Zone constants
export const ZONE_TYPES = [
  { value: 'BULK_STORAGE', label: 'Lưu trữ hàng rời' },
  { value: 'BAGGED_STORAGE', label: 'Lưu trữ hàng bao' },
  { value: 'CONTAINER_YARD', label: 'Bãi container' },
  { value: 'RECEIVING', label: 'Khu vực nhận hàng' },
  { value: 'SHIPPING', label: 'Khu vực xuất hàng' },
  { value: 'STAGING', label: 'Khu vực tập kết' },
]

// Location constants
export const LOCATION_TYPES = [
  { value: 'FLOOR', label: 'Sàn' },
  { value: 'RACK', label: 'Kệ' },
  { value: 'BIN', label: 'Ngăn' },
  { value: 'PILE', label: 'Đống' },
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
]

// Vehicle Type constants
export const VEHICLE_CATEGORIES = [
  { value: 'TRUCK', label: 'Xe tải' },
  { value: 'TRAILER', label: 'Xe đầu kéo' },
  { value: 'CONTAINER_TRUCK', label: 'Xe container' },
  { value: 'FORKLIFT', label: 'Xe nâng' },
  { value: 'CRANE', label: 'Cẩu' },
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
