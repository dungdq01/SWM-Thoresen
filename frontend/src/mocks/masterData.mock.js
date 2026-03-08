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
  uoms: [
    { id: 'uom-001', uomCode: 'KG', description: 'Kilogram', uomClass: 'WEIGHT', isBaseUom: true, decimalPrecision: 3, isActive: true, rowVersion: 1 },
    { id: 'uom-002', uomCode: 'MT', description: 'Metric Ton', uomClass: 'WEIGHT', isBaseUom: false, decimalPrecision: 3, isActive: true, rowVersion: 1 },
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
}

const withWarehouse = (row) => ({ ...row, warehouse: db.warehouses.find((item) => item.id === row.warehouseId) })
const withZone = (row) => ({ ...withWarehouse(row), zone: db.zones.find((item) => item.id === row.zoneId) })
const withItem = (row) => ({ ...row, baseUom: db.uoms.find((item) => item.id === row.baseUomId) })

function crudList(items, params, keywordFields, extraFilter = () => true) {
  const filtered = items.filter((item) => byKeyword(item, params.keyword, keywordFields) && extraFilter(item))
  return delay({ ...paginate(filtered, params.page, params.pageSize) })
}

function crudCreate(collection, data) {
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
    create: (data) => crudCreate('owners', data), update: (id, data) => crudUpdate('owners', id, data), deactivate: (id) => crudDeactivate('owners', id), reactivate: (id) => crudReactivate('owners', id),
  },
  vendorApi: {
    getList: (params = {}) => crudList(db.vendors, params, ['vendorCode', 'vendorName', 'contactName'], (item) => (params.isActive === undefined ? true : item.isActive === params.isActive) && (!params.supplierGroup || item.supplierGroup === params.supplierGroup)),
    getById: (id) => delay({ data: db.vendors.find((item) => item.id === id) }),
    create: (data) => crudCreate('vendors', data), update: (id, data) => crudUpdate('vendors', id, data), deactivate: (id) => crudDeactivate('vendors', id), reactivate: (id) => crudReactivate('vendors', id),
  },
  itemApi: {
    getList: (params = {}) => crudList(db.items.map(withItem), params, ['itemCode', 'itemName'], (item) => (params.isActive === undefined ? true : item.isActive === params.isActive) && (!params.cargoForm || item.cargoForm === params.cargoForm) && (!params.productGroup || item.productGroup === params.productGroup)),
    getById: (id) => delay({ data: withItem(db.items.find((item) => item.id === id)) }),
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
    getItems: () => delay({ data: db.items.filter((item) => item.isActive).map((item) => ({ id: item.id, code: item.itemCode, name: item.itemName })) }),
    getWarehouses: () => delay({ data: db.warehouses.filter((item) => item.isActive).map((item) => ({ id: item.id, code: item.warehouseCode, name: item.warehouseName })) }),
    getZones: (warehouseId) => delay({ data: db.zones.filter((item) => item.isActive && (!warehouseId || item.warehouseId === warehouseId)).map((item) => ({ id: item.id, code: item.zoneCode, name: item.zoneName })) }),
    getLocations: ({ warehouseId, zoneId } = {}) => delay({ data: db.locations.filter((item) => item.isActive && (!warehouseId || item.warehouseId === warehouseId) && (!zoneId || item.zoneId === zoneId)).map((item) => ({ id: item.id, code: item.locationCode, name: item.locationCode })) }),
    getUoms: () => delay({ data: db.uoms.filter((item) => item.isActive).map((item) => ({ id: item.id, code: item.uomCode, name: item.description })) }),
    getVehicleTypes: () => delay({ data: db.vehicleTypes.filter((item) => item.isActive).map((item) => ({ id: item.id, code: item.vehicleTypeCode, name: item.vehicleTypeName })) }),
    getInventoryStatuses: () => delay({ data: db.inventoryStatuses.map((item) => ({ id: item.id, code: item.statusCode, name: item.description })) }),
  },
  __db: db,
}
