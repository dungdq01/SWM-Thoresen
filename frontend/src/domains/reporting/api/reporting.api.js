import { httpClient } from '@shared/api/httpClient'

const BASE_URL = '/reporting'

export const reportingApi = {
  getDashboard: () => httpClient.get(`${BASE_URL}/dashboard/summary`),
  getInventoryReport: (params) => httpClient.get(`${BASE_URL}/inventory/on-hand`, { params }),
  getBillingReport: (params) => httpClient.get(`${BASE_URL}/billing/summary`, { params }),
  getAuditLogs: (params) => httpClient.get(`${BASE_URL}/audit`, { params }),
  getReconResults: (params) => httpClient.get(`${BASE_URL}/reconciliation/results`, { params }),
  getGoLiveGates: () => httpClient.get(`${BASE_URL}/go-live/status`),
  updateGoLiveGate: (id, data) => httpClient.put(`${BASE_URL}/go-live/${id}`, data),
}
