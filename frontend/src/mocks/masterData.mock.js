import { delay, paginate, byKeyword } from './utils'

const db = {
  owners: [
    { id: 'owner-001', ownerCode: 'CUST001', ownerName: 'Thoresen Bulk', shortName: 'THO', ownerGroup: 'FOREIGN', ownerType: 'IMPORT', taxCode: 'TAX-001', isActive: true, rowVersion: 1 },
    { id: 'owner-002', ownerCode: 'CUST002', ownerName: 'TVL Trading', shortName: 'TVL', ownerGroup: 'LOCAL', ownerType: 'DOMESTIC', taxCode: 'TAX-002', isActive: true, rowVersion: 1 },
  ],
  vendors: [
    { id: 'vendor-001', vendorCode: 'VSL001', vendorName: 'Ocean Carrier', supplierGroup: 'VESSEL', contactName: 'Captain Long', phone: '0900000001', email: 'ops@ocean.test', isActive: true, rowVersion: 1 },
    { id: 'vendor-002', vendorCode: 'TRK001', vendorName: 'Local Trucking', supplierGroup: 'TRUCK', contactName: 'Tran Huy', phone: '0900000002', email: 'dispatch@truck.test', isActive: true, rowVersion: 1 },
  ],
  customers: [
    { id: 'cust-001', customerCode: 'CUS001', customerName: 'Công ty TNHH ABC', shortName: 'ABC', customerGroup: 'CORPORATE', customerType: 'BUYER', taxCode: 'MST-001', contactName: 'Nguyễn Văn A', phone: '0901234567', email: 'abc@company.test', address: '123 Nguyễn Huệ, Q1, HCM', isActive: true, rowVersion: 1 },
    { id: 'cust-002', customerCode: 'CUS002', customerName: 'Công ty CP XYZ', shortName: 'XYZ', customerGroup: 'CORPORATE', customerType: 'CONSIGNEE', taxCode: 'MST-002', contactName: 'Trần Thị B', phone: '0907654321', email: 'xyz@company.test', address: '456 Lê Lợi, Q1, HCM', isActive: true, rowVersion: 1 },
    { id: 'cust-003', customerCode: 'CUS003', customerName: 'Hộ kinh doanh DEF', shortName: 'DEF', customerGroup: 'INDIVIDUAL', customerType: 'BUYER', taxCode: '', contactName: 'Lê Văn C', phone: '0912345678', email: 'def@gmail.test', address: '789 CMT8, Q3, HCM', isActive: true, rowVersion: 1 },
  ],
  uoms: [
    { id: 'uom-001', uomCode: 'KG', description: 'Kilogram', uomClass: 'WEIGHT', isBaseUom: true, decimalPrecision: 3, isActive: true, rowVersion: 1 },
    { id: 'uom-002', uomCode: 'MT', description: 'Metric Ton', uomClass: 'WEIGHT', isBaseUom: false, decimalPrecision: 3, isActive: true, rowVersion: 1 },
    { id: 'uom-003', uomCode: 'BAG', description: 'Bao (50kg)', uomClass: 'QUANTITY', isBaseUom: false, decimalPrecision: 0, isActive: true, rowVersion: 1 },
    { id: 'uom-004', uomCode: 'L', description: 'Lít', uomClass: 'VOLUME', isBaseUom: true, decimalPrecision: 2, isActive: true, rowVersion: 1 },
    { id: 'uom-005', uomCode: 'M3', description: 'Mét khối', uomClass: 'VOLUME', isBaseUom: false, decimalPrecision: 3, isActive: true, rowVersion: 1 },
  ],
  uomConversions: [
    { id: 'conv-001', fromUomId: 'uom-002', toUomId: 'uom-001', conversionFactor: 1000, description: '1 MT = 1000 KG', isActive: true, rowVersion: 1 },
    { id: 'conv-002', fromUomId: 'uom-003', toUomId: 'uom-001', conversionFactor: 50, description: '1 BAG = 50 KG', isActive: true, rowVersion: 1 },
    { id: 'conv-003', fromUomId: 'uom-005', toUomId: 'uom-004', conversionFactor: 1000, description: '1 M3 = 1000 L', isActive: true, rowVersion: 1 },
  ],
  items: [
    { id: 'item-001', itemCode: 'RICE001', itemName: 'Gạo 5% tấm', cargoForm: 'BAGGED', productGroup: 'AGRICULTURAL', baseUomId: 'uom-001', isActive: true, rowVersion: 1 },
    { id: 'item-002', itemCode: 'FERT001', itemName: 'Phân Urea', cargoForm: 'BULK', productGroup: 'FERTILIZER', baseUomId: 'uom-001', isActive: true, rowVersion: 1 },
  ],
  warehouses: [
    { id: 'wh-001', warehouseCode: 'WH5.1', warehouseName: 'Kho 5.1', warehouseType: 'COVERED', maxCapacityMt: 50000, isActive: true, rowVersion: 1 },
    { id: 'wh-002', warehouseCode: 'WH-OPEN', warehouseName: 'Bãi hở A', warehouseType: 'OPEN', maxCapacityMt: 20000, isActive: true, rowVersion: 1 },
  ],
  zones: [
    { id: 'zone-001', zoneCode: 'RCV-A', zoneName: 'Receiving A', warehouseId: 'wh-001', zoneType: 'RECEIVING', capacityMt: 5000, isActive: true, rowVersion: 1 },
    { id: 'zone-002', zoneCode: 'STG-A1', zoneName: 'Storage A1', warehouseId: 'wh-001', zoneType: 'BAGGED_STORAGE', capacityMt: 15000, isActive: true, rowVersion: 1 },
  ],
  locations: [
    { id: 'loc-001', locationCode: 'STORAGE-A1-01', warehouseId: 'wh-001', zoneId: 'zone-002', locationType: 'RACK', areaM2: 120, stackLimitKg: 40000, status: 'AVAILABLE', isActive: true, rowVersion: 1 },
    { id: 'loc-002', locationCode: 'RECV-A-DOCK', warehouseId: 'wh-001', zoneId: 'zone-001', locationType: 'FLOOR', areaM2: 90, stackLimitKg: 25000, status: 'OCCUPIED', isActive: true, rowVersion: 1 },
  ],
  vehicleTypes: [
    { id: 'veh-001', vehicleTypeCode: 'TRUCK_15T', vehicleTypeName: 'Xe tải 15T', category: 'TRUCK', maxPayloadKg: 15000, defaultTareWeightKg: 6500, isActive: true, rowVersion: 1 },
    { id: 'veh-002', vehicleTypeCode: 'CONT_40', vehicleTypeName: 'Container 40FT', category: 'CONTAINER_TRUCK', maxPayloadKg: 28000, defaultTareWeightKg: 9800, isActive: true, rowVersion: 1 },
  ],
  inventoryStatuses: [
    { id: 'st-001', statusCode: 'AVAILABLE', description: 'Sẵn sàng xuất/nhập', isAllocatable: true, isSystemLocked: true, rowVersion: 1 },
    { id: 'st-002', statusCode: 'DAMAGED', description: 'Hư hỏng chờ xử lý', isAllocatable: false, isSystemLocked: true, rowVersion: 1 },
    { id: 'st-003', statusCode: 'BLOCKED', description: 'Bị khóa nghiệp vụ', isAllocatable: false, isSystemLocked: true, rowVersion: 1 },
    { id: 'st-004', statusCode: 'IN_TRANSIT', description: 'Đang luân chuyển', isAllocatable: false, isSystemLocked: true, rowVersion: 1 },
  ],
  dropdownConfigs: [
    { id: 'dd-001', entity: 'owner', fieldName: 'ownerGroup', value: 'LOCAL', label: 'Nội địa', sortOrder: 1, isDefault: true, isActive: true },
    { id: 'dd-002', entity: 'owner', fieldName: 'ownerGroup', value: 'FOREIGN', label: 'Nước ngoài', sortOrder: 2, isDefault: false, isActive: true },
    { id: 'dd-003', entity: 'owner', fieldName: 'ownerType', value: 'DOMESTIC', label: 'Trong nước', sortOrder: 1, isDefault: true, isActive: true },
    { id: 'dd-004', entity: 'owner', fieldName: 'ownerType', value: 'EXPORT', label: 'Xuất khẩu', sortOrder: 2, isDefault: false, isActive: true },
    { id: 'dd-005', entity: 'owner', fieldName: 'ownerType', value: 'IMPORT', label: 'Nhập khẩu', sortOrder: 3, isDefault: false, isActive: true },
    { id: 'dd-006', entity: 'vendor', fieldName: 'supplierGroup', value: 'VESSEL', label: 'Tàu', sortOrder: 1, isDefault: true, isActive: true },
    { id: 'dd-007', entity: 'vendor', fieldName: 'supplierGroup', value: 'TRUCK', label: 'Xe tải', sortOrder: 2, isDefault: false, isActive: true },
    { id: 'dd-008', entity: 'vendor', fieldName: 'supplierGroup', value: 'BARGE', label: 'Sà lan', sortOrder: 3, isDefault: false, isActive: true },
    { id: 'dd-009', entity: 'vendor', fieldName: 'supplierGroup', value: 'OTHER', label: 'Khác', sortOrder: 4, isDefault: false, isActive: true },
    { id: 'dd-010', entity: 'item', fieldName: 'cargoForm', value: 'BULK', label: 'Hàng rời', sortOrder: 1, isDefault: true, isActive: true },
    { id: 'dd-011', entity: 'item', fieldName: 'cargoForm', value: 'BAGGED', label: 'Đóng bao', sortOrder: 2, isDefault: false, isActive: true },
    { id: 'dd-012', entity: 'item', fieldName: 'cargoForm', value: 'CONTAINERIZED', label: 'Container', sortOrder: 3, isDefault: false, isActive: true },
    { id: 'dd-013', entity: 'item', fieldName: 'cargoForm', value: 'LIQUID', label: 'Lỏng', sortOrder: 4, isDefault: false, isActive: true },
    { id: 'dd-014', entity: 'item', fieldName: 'productGroup', value: 'AGRICULTURAL', label: 'Nông sản', sortOrder: 1, isDefault: true, isActive: true },
    { id: 'dd-015', entity: 'item', fieldName: 'productGroup', value: 'FERTILIZER', label: 'Phân bón', sortOrder: 2, isDefault: false, isActive: true },
    { id: 'dd-016', entity: 'item', fieldName: 'productGroup', value: 'CHEMICAL', label: 'Hóa chất', sortOrder: 3, isDefault: false, isActive: true },
    { id: 'dd-017', entity: 'item', fieldName: 'productGroup', value: 'STEEL', label: 'Thép', sortOrder: 4, isDefault: false, isActive: true },
    { id: 'dd-018', entity: 'item', fieldName: 'productGroup', value: 'GENERAL', label: 'Hàng tổng hợp', sortOrder: 5, isDefault: false, isActive: true },
    { id: 'dd-019', entity: 'warehouse', fieldName: 'warehouseType', value: 'COVERED', label: 'Kho có mái che', sortOrder: 1, isDefault: true, isActive: true },
    { id: 'dd-020', entity: 'warehouse', fieldName: 'warehouseType', value: 'OPEN', label: 'Bãi hở', sortOrder: 2, isDefault: false, isActive: true },
    { id: 'dd-021', entity: 'warehouse', fieldName: 'warehouseType', value: 'COLD', label: 'Kho lạnh', sortOrder: 3, isDefault: false, isActive: true },
    { id: 'dd-022', entity: 'warehouse', fieldName: 'warehouseType', value: 'HAZMAT', label: 'Kho hàng nguy hiểm', sortOrder: 4, isDefault: false, isActive: true },
    { id: 'dd-023', entity: 'customer', fieldName: 'customerGroup', value: 'CORPORATE', label: 'Doanh nghiệp', sortOrder: 1, isDefault: true, isActive: true },
    { id: 'dd-024', entity: 'customer', fieldName: 'customerGroup', value: 'INDIVIDUAL', label: 'Cá nhân', sortOrder: 2, isDefault: false, isActive: true },
    { id: 'dd-025', entity: 'customer', fieldName: 'customerType', value: 'BUYER', label: 'Người mua', sortOrder: 1, isDefault: true, isActive: true },
    { id: 'dd-026', entity: 'customer', fieldName: 'customerType', value: 'CONSIGNEE', label: 'Người nhận hàng', sortOrder: 2, isDefault: false, isActive: true },
    { id: 'dd-027', entity: 'customer', fieldName: 'customerType', value: 'SHIPPER', label: 'Người gửi hàng', sortOrder: 3, isDefault: false, isActive: true },
  ],
}

const withWarehouse = (row) => ({ ...row, warehouse: db.warehouses.find((item) => item.id === row.warehouseId) })
const withZone = (row) => ({ ...withWarehouse(row), zone: db.zones.find((item) => item.id === row.zoneId) })
const withItem = (row) => ({ ...row, baseUom: db.uoms.find((item) => item.id === row.baseUomId) })

function crudList(items, params, keywordFields, extraFilter = () => true) {
  const filtered = items.filter((item) => byKeyword(item, params.keyword, keywordFields) && extraFilter(item))
  return delay({ ...paginate(filtered, params.page, params.pageSize) })
}

const CODE_FIELD_MAP = {
  owners: 'ownerCode', vendors: 'vendorCode', customers: 'customerCode', items: 'itemCode',
  warehouses: 'warehouseCode', zones: 'zoneCode', locations: 'locationCode',
  uoms: 'uomCode', vehicleTypes: 'vehicleTypeCode',
}

const CODE_PREFIX_MAP = {
  owners: 'OWN',
  vendors: 'VND',
  customers: 'CUS',
  items: 'ITEM',
  warehouses: 'WH',
  zones: 'ZONE',
  locations: 'LOC',
  uoms: 'UOM',
  vehicleTypes: 'VT',
}

function autoGenCode(collection) {
  const prefix = CODE_PREFIX_MAP[collection] || collection.toUpperCase().slice(0, 4)
  const codeField = CODE_FIELD_MAP[collection]
  const existingCodes = db[collection]
    .map((r) => r[codeField])
    .filter((c) => c && c.startsWith(prefix + '-'))
    .map((c) => {
      const num = parseInt(c.replace(prefix + '-', ''), 10)
      return isNaN(num) ? 0 : num
    })
  const nextNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1
  return `${prefix}-${String(nextNum).padStart(3, '0')}`
}

function crudCreate(collection, data) {
  const codeField = CODE_FIELD_MAP[collection]
  if (codeField && !data[codeField]) {
    data[codeField] = autoGenCode(collection)
  }
  if (codeField && data[codeField]) {
    const duplicate = db[collection].find(
      (r) => r[codeField]?.toUpperCase() === data[codeField]?.toUpperCase()
    )
    if (duplicate) {
      return delay(null, { statusCode: 409, message: `Mã "${data[codeField]}" đã tồn tại. Vui lòng chọn mã khác.` })
    }
  }
  const record = { id: `${collection}-${Date.now()}`, isActive: true, rowVersion: 1, ...data }
  db[collection].unshift(record)
  return delay({ data: record })
}

function crudUpdate(collection, id, data) {
  const index = db[collection].findIndex((item) => item.id === id)
  db[collection][index] = { ...db[collection][index], ...data, rowVersion: (db[collection][index].rowVersion || 1) + 1 }
  return delay({ data: db[collection][index] })
}

function crudDeactivate(collection, id) {
  const item = db[collection].find((record) => record.id === id)
  item.isActive = false
  item.rowVersion += 1
  return delay({ data: item })
}

function crudReactivate(collection, id) {
  const item = db[collection].find((record) => record.id === id)
  item.isActive = true
  item.rowVersion += 1
  return delay({ data: item })
}

export const masterDataMockApi = {
  ownerApi: {
    getList: (params = {}) => crudList(db.owners, params, ['ownerCode', 'ownerName', 'taxCode'], (item) => (params.isActive === undefined ? true : item.isActive === params.isActive) && (!params.ownerGroup || item.ownerGroup === params.ownerGroup) && (!params.ownerType || item.ownerType === params.ownerType)),
    getById: (id) => delay({ data: db.owners.find((item) => item.id === id) }),
    getNextCode: () => delay({ data: { code: autoGenCode('owners'), prefix: CODE_PREFIX_MAP.owners } }),
    create: (data) => crudCreate('owners', data), update: (id, data) => crudUpdate('owners', id, data), deactivate: (id) => crudDeactivate('owners', id), reactivate: (id) => crudReactivate('owners', id),
  },
  vendorApi: {
    getList: (params = {}) => crudList(db.vendors, params, ['vendorCode', 'vendorName', 'contactName'], (item) => (params.isActive === undefined ? true : item.isActive === params.isActive) && (!params.supplierGroup || item.supplierGroup === params.supplierGroup)),
    getById: (id) => delay({ data: db.vendors.find((item) => item.id === id) }),
    getNextCode: () => delay({ data: { code: autoGenCode('vendors'), prefix: CODE_PREFIX_MAP.vendors } }),
    create: (data) => crudCreate('vendors', data), update: (id, data) => crudUpdate('vendors', id, data), deactivate: (id) => crudDeactivate('vendors', id), reactivate: (id) => crudReactivate('vendors', id),
  },
  customerApi: {
    getList: (params = {}) => crudList(db.customers, params, ['customerCode', 'customerName', 'contactName', 'taxCode'], (item) => (params.isActive === undefined ? true : item.isActive === params.isActive) && (!params.customerGroup || item.customerGroup === params.customerGroup) && (!params.customerType || item.customerType === params.customerType)),
    getById: (id) => delay({ data: db.customers.find((item) => item.id === id) }),
    getNextCode: () => delay({ data: { code: autoGenCode('customers'), prefix: CODE_PREFIX_MAP.customers } }),
    create: (data) => crudCreate('customers', data), update: (id, data) => crudUpdate('customers', id, data), deactivate: (id) => crudDeactivate('customers', id), reactivate: (id) => crudReactivate('customers', id),
  },
  itemApi: {
    getList: (params = {}) => crudList(db.items.map(withItem), params, ['itemCode', 'itemName'], (item) => (params.isActive === undefined ? true : item.isActive === params.isActive) && (!params.cargoForm || item.cargoForm === params.cargoForm) && (!params.productGroup || item.productGroup === params.productGroup)),
    getById: (id) => delay({ data: withItem(db.items.find((item) => item.id === id)) }),
    getNextCode: () => delay({ data: { code: autoGenCode('items'), prefix: CODE_PREFIX_MAP.items } }),
    create: (data) => crudCreate('items', data), update: (id, data) => crudUpdate('items', id, data), deactivate: (id) => crudDeactivate('items', id), reactivate: (id) => crudReactivate('items', id),
  },
  warehouseApi: {
    getList: (params = {}) => crudList(db.warehouses, params, ['warehouseCode', 'warehouseName'], (item) => (params.isActive === undefined ? true : item.isActive === params.isActive) && (!params.warehouseType || item.warehouseType === params.warehouseType)),
    getById: (id) => delay({ data: db.warehouses.find((item) => item.id === id) }),
    create: (data) => crudCreate('warehouses', data), update: (id, data) => crudUpdate('warehouses', id, data), deactivate: (id) => crudDeactivate('warehouses', id), reactivate: (id) => crudReactivate('warehouses', id),
  },
  zoneApi: {
    getList: (params = {}) => crudList(db.zones.map(withWarehouse), params, ['zoneCode', 'zoneName'], (item) => (params.isActive === undefined ? true : item.isActive === params.isActive) && (!params.warehouseId || item.warehouseId === params.warehouseId) && (!params.zoneType || item.zoneType === params.zoneType)),
    getById: (id) => delay({ data: withWarehouse(db.zones.find((item) => item.id === id)) }),
    create: (data) => crudCreate('zones', data), update: (id, data) => crudUpdate('zones', id, data), deactivate: (id) => crudDeactivate('zones', id), reactivate: (id) => crudReactivate('zones', id),
  },
  locationApi: {
    getList: (params = {}) => crudList(db.locations.map(withZone), params, ['locationCode'], (item) => (params.isActive === undefined ? true : item.isActive === params.isActive) && (!params.warehouseId || item.warehouseId === params.warehouseId) && (!params.zoneId || item.zoneId === params.zoneId) && (!params.locationType || item.locationType === params.locationType)),
    getById: (id) => delay({ data: withZone(db.locations.find((item) => item.id === id)) }),
    create: (data) => crudCreate('locations', data), update: (id, data) => crudUpdate('locations', id, data), deactivate: (id) => crudDeactivate('locations', id), reactivate: (id) => crudReactivate('locations', id),
  },
  uomApi: {
    getList: (params = {}) => crudList(db.uoms, params, ['uomCode', 'description'], (item) => (params.isActive === undefined ? true : item.isActive === params.isActive) && (!params.uomClass || item.uomClass === params.uomClass)),
    getById: (id) => delay({ data: db.uoms.find((item) => item.id === id) }),
    create: (data) => crudCreate('uoms', data), update: (id, data) => crudUpdate('uoms', id, data), deactivate: (id) => crudDeactivate('uoms', id), reactivate: (id) => crudReactivate('uoms', id),
  },
  uomConversionApi: {
    getList: (params = {}) => {
      const withUoms = (conv) => ({
        ...conv,
        fromUom: db.uoms.find((u) => u.id === conv.fromUomId),
        toUom: db.uoms.find((u) => u.id === conv.toUomId),
      })
      const filtered = db.uomConversions
        .map(withUoms)
        .filter((item) => {
          const matchesActive = params.isActive === undefined ? true : item.isActive === params.isActive
          const matchesFromUom = !params.fromUomId || item.fromUomId === params.fromUomId
          const matchesToUom = !params.toUomId || item.toUomId === params.toUomId
          const matchesKeyword = !params.keyword || 
            item.fromUom?.uomCode?.toLowerCase().includes(params.keyword.toLowerCase()) ||
            item.toUom?.uomCode?.toLowerCase().includes(params.keyword.toLowerCase()) ||
            item.description?.toLowerCase().includes(params.keyword.toLowerCase())
          return matchesActive && matchesFromUom && matchesToUom && matchesKeyword
        })
      return delay({ ...paginate(filtered, params.page, params.pageSize) })
    },
    getById: (id) => {
      const conv = db.uomConversions.find((item) => item.id === id)
      if (!conv) return delay({ data: null })
      return delay({
        data: {
          ...conv,
          fromUom: db.uoms.find((u) => u.id === conv.fromUomId),
          toUom: db.uoms.find((u) => u.id === conv.toUomId),
        },
      })
    },
    create: (data) => {
      const duplicate = db.uomConversions.find(
        (r) => r.fromUomId === data.fromUomId && r.toUomId === data.toUomId
      )
      if (duplicate) {
        return delay(null, { statusCode: 409, message: 'Quy đổi này đã tồn tại.' })
      }
      const record = { id: `conv-${Date.now()}`, isActive: true, rowVersion: 1, ...data }
      db.uomConversions.push(record)
      return delay({ data: record })
    },
    update: (id, data) => {
      const index = db.uomConversions.findIndex((item) => item.id === id)
      if (index === -1) return delay(null, { statusCode: 404, message: 'Không tìm thấy bản ghi' })
      db.uomConversions[index] = { ...db.uomConversions[index], ...data, rowVersion: db.uomConversions[index].rowVersion + 1 }
      return delay({ data: db.uomConversions[index] })
    },
    delete: (id) => {
      const index = db.uomConversions.findIndex((item) => item.id === id)
      if (index === -1) return delay(null, { statusCode: 404, message: 'Không tìm thấy bản ghi' })
      db.uomConversions.splice(index, 1)
      return delay({ data: { success: true } })
    },
  },
  vehicleTypeApi: {
    getList: (params = {}) => crudList(db.vehicleTypes, params, ['vehicleTypeCode', 'vehicleTypeName'], (item) => (params.isActive === undefined ? true : item.isActive === params.isActive) && (!params.category || item.category === params.category)),
    getById: (id) => delay({ data: db.vehicleTypes.find((item) => item.id === id) }),
    create: (data) => crudCreate('vehicleTypes', data), update: (id, data) => crudUpdate('vehicleTypes', id, data), deactivate: (id) => crudDeactivate('vehicleTypes', id), reactivate: (id) => crudReactivate('vehicleTypes', id),
  },
  inventoryStatusApi: {
    getList: (params = {}) => crudList(db.inventoryStatuses, params, ['statusCode', 'description']),
    getById: (id) => delay({ data: db.inventoryStatuses.find((item) => item.id === id) }),
    update: (id, data) => crudUpdate('inventoryStatuses', id, data),
  },
  lookupApi: {
    getOwners: () => delay({ data: db.owners.filter((item) => item.isActive).map((item) => ({ id: item.id, code: item.ownerCode, name: item.ownerName })) }),
    getVendors: () => delay({ data: db.vendors.filter((item) => item.isActive).map((item) => ({ id: item.id, code: item.vendorCode, name: item.vendorName })) }),
    getCustomers: () => delay({ data: db.customers.filter((item) => item.isActive).map((item) => ({ id: item.id, code: item.customerCode, name: item.customerName })) }),
    getItems: () => delay({ data: db.items.filter((item) => item.isActive).map((item) => ({ id: item.id, code: item.itemCode, name: item.itemName })) }),
    getWarehouses: () => delay({ data: db.warehouses.filter((item) => item.isActive).map((item) => ({ id: item.id, code: item.warehouseCode, name: item.warehouseName })) }),
    getZones: (warehouseId) => delay({ data: db.zones.filter((item) => item.isActive && (!warehouseId || item.warehouseId === warehouseId)).map((item) => ({ id: item.id, code: item.zoneCode, name: item.zoneName })) }),
    getLocations: ({ warehouseId, zoneId } = {}) => delay({ data: db.locations.filter((item) => item.isActive && (!warehouseId || item.warehouseId === warehouseId) && (!zoneId || item.zoneId === zoneId)).map((item) => ({ id: item.id, code: item.locationCode, name: item.locationCode })) }),
    getUoms: () => delay({ data: db.uoms.filter((item) => item.isActive).map((item) => ({ id: item.id, code: item.uomCode, name: item.description })) }),
    getVehicleTypes: () => delay({ data: db.vehicleTypes.filter((item) => item.isActive).map((item) => ({ id: item.id, code: item.vehicleTypeCode, name: item.vehicleTypeName })) }),
    getInventoryStatuses: () => delay({ data: db.inventoryStatuses.map((item) => ({ id: item.id, code: item.statusCode, name: item.description })) }),
    getDropdownOptions: (entity, fieldName) => delay({
      data: db.dropdownConfigs
        .filter((item) => item.isActive && item.entity === entity && item.fieldName === fieldName)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({ value: item.value, label: item.label, isDefault: item.isDefault })),
    }),
  },
  dropdownConfigApi: {
    getList: (params = {}) => {
      let filtered = [...db.dropdownConfigs]
      if (params.entity) filtered = filtered.filter((item) => item.entity === params.entity)
      if (params.fieldName) filtered = filtered.filter((item) => item.fieldName === params.fieldName)
      if (params.keyword) {
        const kw = params.keyword.toLowerCase()
        filtered = filtered.filter((item) => item.value.toLowerCase().includes(kw) || item.label.toLowerCase().includes(kw))
      }
      filtered.sort((a, b) => {
        if (a.entity !== b.entity) return a.entity.localeCompare(b.entity)
        if (a.fieldName !== b.fieldName) return a.fieldName.localeCompare(b.fieldName)
        return a.sortOrder - b.sortOrder
      })
      return delay({ ...paginate(filtered, params.page, params.pageSize) })
    },
    getById: (id) => delay({ data: db.dropdownConfigs.find((item) => item.id === id) }),
    create: (data) => {
      const duplicate = db.dropdownConfigs.find(
        (r) => r.entity === data.entity && r.fieldName === data.fieldName && r.value.toUpperCase() === data.value.toUpperCase()
      )
      if (duplicate) {
        return delay(null, { statusCode: 409, message: `Giá trị "${data.value}" đã tồn tại cho field này.` })
      }
      const maxSort = Math.max(0, ...db.dropdownConfigs.filter((r) => r.entity === data.entity && r.fieldName === data.fieldName).map((r) => r.sortOrder))
      const record = { id: `dd-${Date.now()}`, isActive: true, sortOrder: maxSort + 1, isDefault: false, ...data }
      db.dropdownConfigs.push(record)
      return delay({ data: record })
    },
    update: (id, data) => {
      const index = db.dropdownConfigs.findIndex((item) => item.id === id)
      if (index === -1) return delay(null, { statusCode: 404, message: 'Không tìm thấy bản ghi' })
      db.dropdownConfigs[index] = { ...db.dropdownConfigs[index], ...data }
      return delay({ data: db.dropdownConfigs[index] })
    },
    delete: (id) => {
      const index = db.dropdownConfigs.findIndex((item) => item.id === id)
      if (index === -1) return delay(null, { statusCode: 404, message: 'Không tìm thấy bản ghi' })
      db.dropdownConfigs.splice(index, 1)
      return delay({ data: { success: true } })
    },
    setDefault: (id) => {
      const item = db.dropdownConfigs.find((r) => r.id === id)
      if (!item) return delay(null, { statusCode: 404, message: 'Không tìm thấy bản ghi' })
      db.dropdownConfigs.forEach((r) => {
        if (r.entity === item.entity && r.fieldName === item.fieldName) {
          r.isDefault = r.id === id
        }
      })
      return delay({ data: item })
    },
    getEntities: () => delay({
      data: [
        { value: 'owner', label: 'Chủ hàng (Owner)' },
        { value: 'vendor', label: 'Nhà cung cấp (Vendor)' },
        { value: 'customer', label: 'Khách hàng (Customer)' },
        { value: 'item', label: 'Mặt hàng (Item)' },
        { value: 'warehouse', label: 'Kho (Warehouse)' },
      ],
    }),
    getFieldsByEntity: (entity) => {
      const fieldMap = {
        owner: [{ value: 'ownerGroup', label: 'Nhóm chủ hàng' }, { value: 'ownerType', label: 'Loại chủ hàng' }],
        vendor: [{ value: 'supplierGroup', label: 'Nhóm nhà cung cấp' }],
        customer: [{ value: 'customerGroup', label: 'Nhóm khách hàng' }, { value: 'customerType', label: 'Loại khách hàng' }],
        item: [{ value: 'cargoForm', label: 'Dạng hàng' }, { value: 'productGroup', label: 'Nhóm sản phẩm' }],
        warehouse: [{ value: 'warehouseType', label: 'Loại kho' }],
      }
      return delay({ data: fieldMap[entity] || [] })
    },
  },
  __db: db,
}
