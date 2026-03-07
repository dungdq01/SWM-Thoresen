import { httpClient } from '@shared/api/httpClient'

const BASE_URL = '/master-data'

// ==================== OWNER APIs ====================
export const ownerApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/owners`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/owners/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/owners`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/owners/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/owners/${id}/deactivate`, { reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/owners/${id}/reactivate`),
}

// ==================== VENDOR APIs ====================
export const vendorApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/vendors`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/vendors/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/vendors`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/vendors/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/vendors/${id}/deactivate`, { reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/vendors/${id}/reactivate`),
}

// ==================== ITEM APIs ====================
export const itemApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/items`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/items/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/items`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/items/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/items/${id}/deactivate`, { reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/items/${id}/reactivate`),
}

// ==================== WAREHOUSE APIs ====================
export const warehouseApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/warehouses`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/warehouses/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/warehouses`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/warehouses/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/warehouses/${id}/deactivate`, { reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/warehouses/${id}/reactivate`),
}

// ==================== ZONE APIs ====================
export const zoneApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/zones`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/zones/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/zones`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/zones/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/zones/${id}/deactivate`, { reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/zones/${id}/reactivate`),
}

// ==================== LOCATION APIs ====================
export const locationApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/locations`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/locations/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/locations`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/locations/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/locations/${id}/deactivate`, { reason }),
  reactivate: (id) => httpClient.post(`${BASE_URL}/locations/${id}/reactivate`),
}

// ==================== UOM APIs ====================
export const uomApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/uoms`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/uoms/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/uoms`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/uoms/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/uoms/${id}/deactivate`, { reason }),
}

// ==================== VEHICLE TYPE APIs ====================
export const vehicleTypeApi = {
  getList: (params) => httpClient.get(`${BASE_URL}/vehicle-types`, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/vehicle-types/${id}`),
  create: (data) => httpClient.post(`${BASE_URL}/vehicle-types`, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/vehicle-types/${id}`, data),
  deactivate: (id, reason) => httpClient.post(`${BASE_URL}/vehicle-types/${id}/deactivate`, { reason }),
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
}
