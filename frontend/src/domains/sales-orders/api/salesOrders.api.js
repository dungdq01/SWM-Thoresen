import { httpClient } from '@shared/api/httpClient'

const BASE_URL = '/sales-orders'

export const salesOrdersApi = {
  // Dashboard
  getDashboardSummary: (params) => httpClient.get(`${BASE_URL}/dashboard/summary`, { params }),

  // Next number
  getNextSoNumber: () => httpClient.get(`${BASE_URL}/next-number`),

  // CRUD
  getList: (params) => httpClient.get(BASE_URL, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/${id}`),
  create: (data) => httpClient.post(BASE_URL, data),
  update: (id, data) => httpClient.put(`${BASE_URL}/${id}`, data),

  // Actions
  confirm: (id) => httpClient.post(`${BASE_URL}/${id}/confirm`),
  cancel: (id, data) => httpClient.post(`${BASE_URL}/${id}/cancel`, data),
  close: (id, data) => httpClient.post(`${BASE_URL}/${id}/close`, data),
  releaseShipment: (id, data) => httpClient.post(`${BASE_URL}/${id}/release-shipment`, data),

  // Queries
  getFulfillment: (id) => httpClient.get(`${BASE_URL}/${id}/fulfillment`),
  getShipments: (id) => httpClient.get(`${BASE_URL}/${id}/shipments`),
  getHistory: (id) => httpClient.get(`${BASE_URL}/${id}/history`),
}
