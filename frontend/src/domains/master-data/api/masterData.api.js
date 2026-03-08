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
    (id, reason) => httpClient.post(`${BASE_URL}/owners/${id}/deactivate`, { reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.ownerApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/owners/${id}/reactivate`)
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
    (id, reason) => httpClient.post(`${BASE_URL}/vendors/${id}/deactivate`, { reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.vendorApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/vendors/${id}/reactivate`)
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
    (id, reason) => httpClient.post(`${BASE_URL}/items/${id}/deactivate`, { reason })
  ),
  reactivate: withDataSource(
    (id) => masterDataMockApi.itemApi.reactivate(id),
    (id) => httpClient.post(`${BASE_URL}/items/${id}/reactivate`)
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
    (id, reason) => httpClient.post(`${BASE_URL}/warehouses/${id}/deactivate`, { reason })
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
    (id, reason) => httpClient.post(`${BASE_URL}/zones/${id}/deactivate`, { reason })
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
    (id, reason) => httpClient.post(`${BASE_URL}/locations/${id}/deactivate`, { reason })
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
    (id, reason) => httpClient.post(`${BASE_URL}/uoms/${id}/deactivate`, { reason })
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
    (id, reason) => httpClient.post(`${BASE_URL}/vehicle-types/${id}/deactivate`, { reason })
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
}
