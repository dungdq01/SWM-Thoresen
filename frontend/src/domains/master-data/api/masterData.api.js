import { httpClient } from '@shared/api/httpClient'

const BASE_URL = '/master-data'

// ==================== OWNER APIs ====================
export const ownerApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/owners`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/owners/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/owners`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/owners/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/owners/${id}/deactivate`, { note: reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/owners/${id}/reactivate`),
  getNextCode: () => httpClient.get(`${BASE_URL}/owners/next-code`),
}

// ==================== VENDOR APIs ====================
export const vendorApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/vendors`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/vendors/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/vendors`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/vendors/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/vendors/${id}/deactivate`, { note: reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/vendors/${id}/reactivate`),
  getNextCode: () => httpClient.get(`${BASE_URL}/vendors/next-code`),
}

// ==================== CUSTOMER APIs ====================
export const customerApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/customers`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/customers/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/customers`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/customers/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/customers/${id}/deactivate`, { note: reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/customers/${id}/reactivate`),
  getNextCode: () => httpClient.get(`${BASE_URL}/customers/next-code`),
}

// ==================== ITEM APIs ====================
export const itemApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/items`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/items/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/items`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/items/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/items/${id}/deactivate`, { note: reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/items/${id}/reactivate`),
  getNextCode: () => httpClient.get(`${BASE_URL}/items/next-code`),
}

// ==================== WAREHOUSE APIs ====================
export const warehouseApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/warehouses`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/warehouses/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/warehouses`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/warehouses/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/warehouses/${id}/deactivate`, { note: reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/warehouses/${id}/reactivate`),
}

// ==================== ZONE APIs ====================
export const zoneApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/zones`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/zones/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/zones`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/zones/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/zones/${id}/deactivate`, { note: reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/zones/${id}/reactivate`),
}

// ==================== LOCATION APIs ====================
export const locationApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/locations`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/locations/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/locations`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/locations/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/locations/${id}/deactivate`, { note: reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/locations/${id}/reactivate`),
}

// ==================== UOM APIs ====================
export const uomApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/uoms`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/uoms/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/uoms`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/uoms/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/uoms/${id}/deactivate`, { note: reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/uoms/${id}/reactivate`),
}

// ==================== UOM CONVERSION APIs ====================
export const uomConversionApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/uom-conversions`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/uom-conversions/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/uom-conversions`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/uom-conversions/${id}`, data),
  delete: (id) => httpClient.delete(`${BASE_URL}/uom-conversions/${id}`),
}

// ==================== VEHICLE TYPE APIs ====================
export const vehicleTypeApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/vehicle-types`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/vehicle-types/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/vehicle-types`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/vehicle-types/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/vehicle-types/${id}/deactivate`, { note: reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/vehicle-types/${id}/reactivate`),
}

// ==================== CARRIER APIs ====================
export const carrierApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/carriers`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/carriers/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/carriers`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/carriers/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/carriers/${id}/deactivate`, { note: reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/carriers/${id}/reactivate`),
  getNextCode: () => httpClient.get(`${BASE_URL}/carriers/next-code`),
}

// ==================== ITEM GROUP APIs ====================
export const itemGroupApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/item-groups`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/item-groups/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/item-groups`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/item-groups/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/item-groups/${id}/deactivate`, { note: reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/item-groups/${id}/reactivate`),
  getNextCode: () => httpClient.get(`${BASE_URL}/item-groups/next-code`),
}

// ==================== LOCATION TYPE APIs ====================
export const locationTypeApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/location-types`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/location-types/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/location-types`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/location-types/${id}`, data),
  delete: (id) => httpClient.delete(`${BASE_URL}/location-types/${id}`),
  getNextCode: () => httpClient.get(`${BASE_URL}/location-types/next-code`),
}


// ==================== VESSEL APIs ====================
export const vesselApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/vessels`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/vessels/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/vessels`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/vessels/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/vessels/${id}/deactivate`, { note: reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/vessels/${id}/reactivate`),
  getNextCode: () => httpClient.get(`${BASE_URL}/vessels/next-code`),
}

// ==================== INVENTORY STATUS APIs ====================
export const inventoryStatusApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/inventory-statuses`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/inventory-statuses/${id}`),
  update: (id, data) => httpClient.put(`${BASE_URL}/inventory-statuses/${id}`, data),
}

// ==================== LOOKUP APIs ====================
export const lookupApi = {
  getOwners: () => httpClient.get(`${BASE_URL}/lookups/owners`),
  getVendors: () => httpClient.get(`${BASE_URL}/lookups/vendors`),
  getItems: () => httpClient.get(`${BASE_URL}/lookups/items`),
  getWarehouses: () => httpClient.get(`${BASE_URL}/lookups/warehouses`),
  getZones: (warehouseId) => httpClient.get(`${BASE_URL}/lookups/zones`, { params: { warehouseId } }),
  getLocations: (params) => httpClient.get(`${BASE_URL}/lookups/locations`, { params }),
  getUoms: () => httpClient.get(`${BASE_URL}/lookups/uoms`),
  getVehicleTypes: () => httpClient.get(`${BASE_URL}/lookups/vehicle-types`),
  getInventoryStatuses: () => httpClient.get(`${BASE_URL}/lookups/inventory-statuses`),
  getDropdownOptions: (entity, fieldName) => httpClient.get(`${BASE_URL}/lookups/dropdown-options`, { params: { entity, fieldName } }),
  getItemGroupIdsByWarehouses: (warehouseIds) => httpClient.get(`${BASE_URL}/lookups/item-group-ids-by-warehouses`, { params: { warehouseIds: warehouseIds.join(',') } }),
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
  getList: (params) => httpClient.get(`${BASE_URL}/dropdown-configs`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/dropdown-configs/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/dropdown-configs`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/dropdown-configs/${id}`, data),
  delete: (id) => httpClient.delete(`${BASE_URL}/dropdown-configs/${id}`),
  setDefault: (id) => httpClient.post(`${BASE_URL}/dropdown-configs/${id}/set-default`),
  getEntities: () => httpClient.get(`${BASE_URL}/dropdown-configs/entities`),
  getFieldsByEntity: (entity) => httpClient.get(`${BASE_URL}/dropdown-configs/fields`, { params: { entity } }),
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
