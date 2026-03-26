import { httpClient } from '@shared/api/httpClient'
import { masterDataMockApi } from '@mocks/masterData.mock'
import { isMockApiEnabled } from '@mocks/utils'

const BASE_URL = '/master-data'

const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

// ==================== OWNER APIs ====================
export const ownerApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.ownerApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/owners`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.ownerApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/owners/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.ownerApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/owners`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.ownerApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/owners/${id}`, data)
  ),
  deactivate: withDataSource(
    (id, reason) => masterDataMockApi.ownerApi.deactivate(id, reason),
    (id, reason) => httpClient.post(`${BASE_URL}/owners/${id}/deactivate`, { note: reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.ownerApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/owners/${id}/reactivate`)
  ),
  getNextCode: withDataSource(
    () => masterDataMockApi.ownerApi.getNextCode(),
    () => httpClient.get(`${BASE_URL}/owners/next-code`)
  ),
}

// ==================== VENDOR APIs ====================
export const vendorApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.vendorApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/vendors`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.vendorApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/vendors/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.vendorApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/vendors`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.vendorApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/vendors/${id}`, data)
  ),
  deactivate: withDataSource(
    (id, reason) => masterDataMockApi.vendorApi.deactivate(id, reason),
    (id, reason) => httpClient.post(`${BASE_URL}/vendors/${id}/deactivate`, { note: reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.vendorApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/vendors/${id}/reactivate`)
  ),
  getNextCode: withDataSource(
    () => masterDataMockApi.vendorApi.getNextCode(),
    () => httpClient.get(`${BASE_URL}/vendors/next-code`)
  ),
}

// ==================== CUSTOMER APIs ====================
export const customerApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.customerApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/customers`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.customerApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/customers/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.customerApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/customers`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.customerApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/customers/${id}`, data)
  ),
  deactivate: withDataSource(
    (id, reason) => masterDataMockApi.customerApi.deactivate(id, reason),
    (id, reason) => httpClient.post(`${BASE_URL}/customers/${id}/deactivate`, { note: reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.customerApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/customers/${id}/reactivate`)
  ),
  getNextCode: withDataSource(
    () => masterDataMockApi.customerApi.getNextCode(),
    () => httpClient.get(`${BASE_URL}/customers/next-code`)
  ),
}

// ==================== ITEM APIs ====================
export const itemApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.itemApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/items`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.itemApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/items/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.itemApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/items`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.itemApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/items/${id}`, data)
  ),
  deactivate: withDataSource(
    (id, reason) => masterDataMockApi.itemApi.deactivate(id, reason),
    (id, reason) => httpClient.post(`${BASE_URL}/items/${id}/deactivate`, { note: reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.itemApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/items/${id}/reactivate`)
  ),
  getNextCode: withDataSource(
    () => masterDataMockApi.itemApi.getNextCode(),
    () => httpClient.get(`${BASE_URL}/items/next-code`)
  ),
}

// ==================== WAREHOUSE APIs ====================
export const warehouseApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.warehouseApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/warehouses`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.warehouseApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/warehouses/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.warehouseApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/warehouses`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.warehouseApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/warehouses/${id}`, data)
  ),
  deactivate: withDataSource(
    (id, reason) => masterDataMockApi.warehouseApi.deactivate(id, reason),
    (id, reason) => httpClient.post(`${BASE_URL}/warehouses/${id}/deactivate`, { note: reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.warehouseApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/warehouses/${id}/reactivate`)
  ),
}

// ==================== ZONE APIs ====================
export const zoneApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.zoneApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/zones`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.zoneApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/zones/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.zoneApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/zones`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.zoneApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/zones/${id}`, data)
  ),
  deactivate: withDataSource(
    (id, reason) => masterDataMockApi.zoneApi.deactivate(id, reason),
    (id, reason) => httpClient.post(`${BASE_URL}/zones/${id}/deactivate`, { note: reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.zoneApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/zones/${id}/reactivate`)
  ),
}

// ==================== LOCATION APIs ====================
export const locationApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.locationApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/locations`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.locationApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/locations/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.locationApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/locations`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.locationApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/locations/${id}`, data)
  ),
  deactivate: withDataSource(
    (id, reason) => masterDataMockApi.locationApi.deactivate(id, reason),
    (id, reason) => httpClient.post(`${BASE_URL}/locations/${id}/deactivate`, { note: reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.locationApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/locations/${id}/reactivate`)
  ),
}

// ==================== UOM APIs ====================
export const uomApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.uomApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/uoms`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.uomApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/uoms/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.uomApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/uoms`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.uomApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/uoms/${id}`, data)
  ),
  deactivate: withDataSource(
    (id, reason) => masterDataMockApi.uomApi.deactivate(id, reason),
    (id, reason) => httpClient.post(`${BASE_URL}/uoms/${id}/deactivate`, { note: reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.uomApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/uoms/${id}/reactivate`)
  ),
}

// ==================== UOM CONVERSION APIs ====================
export const uomConversionApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.uomConversionApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/uom-conversions`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.uomConversionApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/uom-conversions/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.uomConversionApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/uom-conversions`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.uomConversionApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/uom-conversions/${id}`, data)
  ),
  delete: withDataSource(
    (id) => masterDataMockApi.uomConversionApi.delete(id),
    (id) => httpClient.delete(`${BASE_URL}/uom-conversions/${id}`)
  ),
}

// ==================== VEHICLE TYPE APIs ====================
export const vehicleTypeApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.vehicleTypeApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/vehicle-types`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.vehicleTypeApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/vehicle-types/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.vehicleTypeApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/vehicle-types`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.vehicleTypeApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/vehicle-types/${id}`, data)
  ),
  deactivate: withDataSource(
    (id, reason) => masterDataMockApi.vehicleTypeApi.deactivate(id, reason),
    (id, reason) => httpClient.post(`${BASE_URL}/vehicle-types/${id}/deactivate`, { note: reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.vehicleTypeApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/vehicle-types/${id}/reactivate`)
  ),
}

// ==================== CARRIER APIs ====================
export const carrierApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.carrierApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/carriers`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.carrierApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/carriers/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.carrierApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/carriers`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.carrierApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/carriers/${id}`, data)
  ),
  deactivate: withDataSource(
    (id, reason) => masterDataMockApi.carrierApi.deactivate(id, reason),
    (id, reason) => httpClient.post(`${BASE_URL}/carriers/${id}/deactivate`, { note: reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.carrierApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/carriers/${id}/reactivate`)
  ),
  getNextCode: withDataSource(
    () => ({ data: { code: 'CAR-XXX' } }),
    () => httpClient.get(`${BASE_URL}/carriers/next-code`)
  ),
}

// ==================== ITEM GROUP APIs ====================
export const itemGroupApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.itemGroupApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/item-groups`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.itemGroupApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/item-groups/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.itemGroupApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/item-groups`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.itemGroupApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/item-groups/${id}`, data)
  ),
  deactivate: withDataSource(
    (id, reason) => masterDataMockApi.itemGroupApi.deactivate(id, reason),
    (id, reason) => httpClient.post(`${BASE_URL}/item-groups/${id}/deactivate`, { note: reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.itemGroupApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/item-groups/${id}/reactivate`)
  ),
  getNextCode: withDataSource(
    () => ({ data: { code: 'IG-XXX' } }),
    () => httpClient.get(`${BASE_URL}/item-groups/next-code`)
  ),
}

// ==================== LOCATION TYPE APIs ====================
export const locationTypeApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.locationTypeApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/location-types`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.locationTypeApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/location-types/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.locationTypeApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/location-types`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.locationTypeApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/location-types/${id}`, data)
  ),
  delete: withDataSource(
    (id) => masterDataMockApi.locationTypeApi.delete(id),
    (id) => httpClient.delete(`${BASE_URL}/location-types/${id}`)
  ),
  getNextCode: withDataSource(
    () => ({ data: { code: 'LT-XXX' } }),
    () => httpClient.get(`${BASE_URL}/location-types/next-code`)
  ),
}

// ==================== OWNER-SKU MAPPING APIs ====================
export const ownerSkuMappingApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.ownerSkuMappingApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/owner-sku-mappings`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.ownerSkuMappingApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/owner-sku-mappings/${id}`)
  ),
  getNextCode: withDataSource(
    () => masterDataMockApi.ownerSkuMappingApi.getNextMappingCode(),
    () => httpClient.get(`${BASE_URL}/owner-sku-mappings/next-code`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.ownerSkuMappingApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/owner-sku-mappings`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.ownerSkuMappingApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/owner-sku-mappings/${id}`, data)
  ),
  delete: withDataSource(
    (id) => masterDataMockApi.ownerSkuMappingApi.delete(id),
    (id) => httpClient.delete(`${BASE_URL}/owner-sku-mappings/${id}`)
  ),
}

// ==================== VESSEL APIs ====================
export const vesselApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.vesselApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/vessels`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.vesselApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/vessels/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.vesselApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/vessels`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.vesselApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/vessels/${id}`, data)
  ),
  deactivate: withDataSource(
    (id, reason) => masterDataMockApi.vesselApi.deactivate(id, reason),
    (id, reason) => httpClient.post(`${BASE_URL}/vessels/${id}/deactivate`, { note: reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.vesselApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/vessels/${id}/reactivate`)
  ),
  getNextCode: withDataSource(
    () => ({ data: { code: 'VSL-XXX' } }),
    () => httpClient.get(`${BASE_URL}/vessels/next-code`)
  ),
}

// ==================== INVENTORY STATUS APIs ====================
export const inventoryStatusApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.inventoryStatusApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/inventory-statuses`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.inventoryStatusApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/inventory-statuses/${id}`)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.inventoryStatusApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/inventory-statuses/${id}`, data)
  ),
}

// ==================== LOOKUP APIs ====================
export const lookupApi = {
  getOwners: withDataSource(
    () => masterDataMockApi.lookupApi.getOwners(),
    () => httpClient.get(`${BASE_URL}/lookups/owners`)
  ),
  getVendors: withDataSource(
    () => masterDataMockApi.lookupApi.getVendors(),
    () => httpClient.get(`${BASE_URL}/lookups/vendors`)
  ),
  getItems: withDataSource(
    () => masterDataMockApi.lookupApi.getItems(),
    () => httpClient.get(`${BASE_URL}/lookups/items`)
  ),
  getWarehouses: withDataSource(
    () => masterDataMockApi.lookupApi.getWarehouses(),
    () => httpClient.get(`${BASE_URL}/lookups/warehouses`)
  ),
  getZones: withDataSource(
    (warehouseId) => masterDataMockApi.lookupApi.getZones(warehouseId),
    (warehouseId) => httpClient.get(`${BASE_URL}/lookups/zones`, { params: { warehouseId } })
  ),
  getLocations: withDataSource(
    (params) => masterDataMockApi.lookupApi.getLocations(params),
    (params) => httpClient.get(`${BASE_URL}/lookups/locations`, { params })
  ),
  getUoms: withDataSource(
    () => masterDataMockApi.lookupApi.getUoms(),
    () => httpClient.get(`${BASE_URL}/lookups/uoms`)
  ),
  getVehicleTypes: withDataSource(
    () => masterDataMockApi.lookupApi.getVehicleTypes(),
    () => httpClient.get(`${BASE_URL}/lookups/vehicle-types`)
  ),
  getInventoryStatuses: withDataSource(
    () => masterDataMockApi.lookupApi.getInventoryStatuses(),
    () => httpClient.get(`${BASE_URL}/lookups/inventory-statuses`)
  ),
  getDropdownOptions: withDataSource(
    (entity, fieldName) => masterDataMockApi.lookupApi.getDropdownOptions(entity, fieldName),
    (entity, fieldName) => httpClient.get(`${BASE_URL}/lookups/dropdown-options`, { params: { entity, fieldName } })
  ),
  getItemGroupIdsByWarehouses: (warehouseIds) =>
    httpClient.get(`${BASE_URL}/lookups/item-group-ids-by-warehouses`, { params: { warehouseIds: warehouseIds.join(',') } }),
}

// ==================== LOT APIs ====================
export const lotApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/lots`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/lots/${id}`),
  getByCode: (lotCode) => httpClient.get(`${BASE_URL}/lots/by-code/${lotCode}`),
  getByHash: (lotHash) => httpClient.get(`${BASE_URL}/lots/by-hash/${lotHash}`),
  create: (data) => httpClient.post(`${BASE_URL}/lots`, data),
  getOrCreate: (data) => httpClient.post(`${BASE_URL}/lots/get-or-create`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/lots/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/lots/${id}/deactivate`, { note: reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/lots/${id}/reactivate`),
  getNextCode: () => httpClient.get(`${BASE_URL}/lots/next-code`),
  getFifo: (params) => httpClient.get(`${BASE_URL}/lots/fifo`, { params }),
  getTraceability: (id) => httpClient.get(`${BASE_URL}/lots/${id}/traceability`),
  getDerivedLots: (id) => httpClient.get(`${BASE_URL}/lots/${id}/derived-lots`),
}

// ==================== OWNER-WAREHOUSE ACCESS APIs ====================
export const ownerWarehouseAccessApi = {
  getList: (ownerId) => httpClient.get(`${BASE_URL}/owners/${ownerId}/warehouses`),
  create: (ownerId, data) => httpClient.post(`${BASE_URL}/owners/${ownerId}/warehouses`, data),
  delete: (ownerId, warehouseId) => httpClient.delete(`${BASE_URL}/owners/${ownerId}/warehouses/${warehouseId}`),
  checkAccess: (ownerId, warehouseId) => httpClient.get(`${BASE_URL}/owners/${ownerId}/warehouses/${warehouseId}/check`),
}

// ==================== ITEM INCOMPATIBILITY APIs ====================
export const itemIncompatibilityApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/item-incompatibilities`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/item-incompatibilities/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/item-incompatibilities`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/item-incompatibilities/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/item-incompatibilities/${id}/deactivate`, { note: reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/item-incompatibilities/${id}/reactivate`),
  checkIncompatibility: (itemId1, itemId2) => httpClient.get(`${BASE_URL}/item-incompatibilities/check`, { params: { itemId1, itemId2 } }),
}

// ==================== DROPDOWN CONFIG APIs ====================
export const dropdownConfigApi = {
  getList: withDataSource(
    (params) => masterDataMockApi.dropdownConfigApi.getList(params),
    (params) => httpClient.get(`${BASE_URL}/dropdown-configs`, { params })
  ),
  getById: withDataSource(
    (id) => masterDataMockApi.dropdownConfigApi.getById(id),
    (id) => httpClient.get(`${BASE_URL}/dropdown-configs/${id}`)
  ),
  create: withDataSource(
    (data) => masterDataMockApi.dropdownConfigApi.create(data),
    (data) => httpClient.post(`${BASE_URL}/dropdown-configs`, data)
  ),
  update: withDataSource(
    (id, data) => masterDataMockApi.dropdownConfigApi.update(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/dropdown-configs/${id}`, data)
  ),
  delete: withDataSource(
    (id) => masterDataMockApi.dropdownConfigApi.delete(id),
    (id) => httpClient.delete(`${BASE_URL}/dropdown-configs/${id}`)
  ),
  setDefault: withDataSource(
    (id) => masterDataMockApi.dropdownConfigApi.setDefault(id),
    (id) => httpClient.post(`${BASE_URL}/dropdown-configs/${id}/set-default`)
  ),
  getEntities: withDataSource(
    () => masterDataMockApi.dropdownConfigApi.getEntities(),
    () => httpClient.get(`${BASE_URL}/dropdown-configs/entities`)
  ),
  getFieldsByEntity: withDataSource(
    (entity) => masterDataMockApi.dropdownConfigApi.getFieldsByEntity(entity),
    (entity) => httpClient.get(`${BASE_URL}/dropdown-configs/fields`, { params: { entity } })
  ),
}

// ==================== MONITORING APIs ====================
export const monitoringApi = {
  getSiteOverview: (siteId = 'TVL-SITE') => httpClient.get('/monitoring/site-overview', { params: { siteId } }),
  getWarehouseDetail: (id) => httpClient.get(`/monitoring/warehouses/${id}/detail`),
}

// ==================== RACK APIs ====================
export const rackApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/racks`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/racks/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/racks`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/racks/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/racks/${id}/deactivate`, { note: reason }),
}

// ==================== LAYOUT APIs ====================
export const layoutApi = {
  getWarehouseLayout: (warehouseId) => httpClient.get(`${BASE_URL}/warehouses/${warehouseId}/layout`),
  saveWarehouseLayout: (warehouseId, data) => httpClient.put(`${BASE_URL}/warehouses/${warehouseId}/layout`, data),
  getSiteLayout: (siteId) => httpClient.get(`${BASE_URL}/sites/${siteId}/layout`),
  saveSiteLayout: (siteId, data) => httpClient.put(`${BASE_URL}/sites/${siteId}/layout`, data),
}
