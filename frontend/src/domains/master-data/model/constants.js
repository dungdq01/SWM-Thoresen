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

// Carrier constants
export const CARRIER_GROUPS = [
  { value: 'TRUCKING', label: 'Vận tải đường bộ' },
  { value: 'SHIPPING_LINE', label: 'Hãng tàu' },
  { value: 'FREIGHT_FORWARDER', label: 'Đại lý vận chuyển' },
  { value: 'BARGE_OPERATOR', label: 'Vận tải đường sông' },
  { value: 'OTHER', label: 'Khác' },
]

export const CARRIER_TRANSPORT_MODES = [
  { value: 'TRUCK', label: 'Xe tải' },
  { value: 'VESSEL', label: 'Tàu biển' },
  { value: 'BARGE', label: 'Sà lan' },
  { value: 'CONTAINER', label: 'Container' },
  { value: 'RAIL', label: 'Đường sắt' },
]

// Owner-SKU Mapping constants
export const BILLING_CLASSES = [
  { value: 'ST01', label: 'ST01 - Standard 1' },
  { value: 'ST02', label: 'ST02 - Standard 2' },
  { value: 'ST03', label: 'ST03 - Standard 3' },
  { value: 'PR01', label: 'PR01 - Premium 1' },
  { value: 'PR02', label: 'PR02 - Premium 2' },
]

// Vessel constants
export const VESSEL_TYPES = [
  { value: 'BULK_CARRIER', label: 'Tàu hàng rời' },
  { value: 'BARGE', label: 'Sà lan' },
  { value: 'GENERAL_CARGO', label: 'Tàu hàng tổng hợp' },
  { value: 'CONTAINER', label: 'Tàu container' },
  { value: 'TANKER', label: 'Tàu dầu' },
  { value: 'OTHER', label: 'Khác' },
]

// Item Group constants
export const ITEM_GROUP_CARGO_FORMS = [
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
  itemGroups: ['master-data', 'item-groups'],
  itemGroupDetail: (id) => ['master-data', 'item-groups', id],
  carriers: ['master-data', 'carriers'],
  carrierDetail: (id) => ['master-data', 'carriers', id],
  vessels: ['master-data', 'vessels'],
  vesselDetail: (id) => ['master-data', 'vessels', id],
  ownerSkuMappings: ['master-data', 'owner-sku-mappings'],
  ownerSkuMappingDetail: (id) => ['master-data', 'owner-sku-mappings', id],
  locationTypes: ['master-data', 'location-types'],
  locationTypeDetail: (id) => ['master-data', 'location-types', id],
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
  // Owner-Warehouse Access
  ownerWarehouseAccess: (ownerId) => ['master-data', 'owner-warehouse-access', ownerId],
  // Item Incompatibility
  itemIncompatibilities: ['master-data', 'item-incompatibilities'],
  itemIncompatibilityDetail: (id) => ['master-data', 'item-incompatibilities', id],
  // Lots
  lots: ['master-data', 'lots'],
  lotDetail: (id) => ['master-data', 'lots', id],
  lotTraceability: (id) => ['master-data', 'lots', id, 'traceability'],
  lotDerivedLots: (id) => ['master-data', 'lots', id, 'derived-lots'],
  lotFifo: (itemId, ownerId, warehouseId) => ['master-data', 'lots', 'fifo', itemId, ownerId, warehouseId],
  // Layout Editor
  racks: ['master-data', 'racks'],
  rackDetail: (id) => ['master-data', 'racks', id],
  warehouseLayout: (id) => ['master-data', 'warehouse-layout', id],
  siteLayout: (siteId) => ['master-data', 'site-layout', siteId],
}

// Item Incompatibility constants
export const INCOMPATIBILITY_RULE_TYPES = [
  { value: 'ITEM_TO_ITEM', label: 'Item ↔ Item' },
  { value: 'ITEM_TO_GROUP', label: 'Item ↔ Nhóm hàng' },
  { value: 'GROUP_TO_GROUP', label: 'Nhóm hàng ↔ Nhóm hàng' },
]

// Lot constants
export const LOT_STATUSES = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động' },
]
