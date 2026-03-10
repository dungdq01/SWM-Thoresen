import { httpClient } from '@shared/api/httpClient'
import { reportingMockApi } from '@mocks/reporting.mock'
import { isMockApiEnabled } from '@mocks/utils'

const BASE_URL = '/reporting'

const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

export const reportingApi = {
  getDashboard: withDataSource(
    () => reportingMockApi.getDashboard(),
    () => httpClient.get(`${BASE_URL}/dashboard/summary`)
  ),

  getInventoryReport: withDataSource(
    (params) => reportingMockApi.getInventoryReport(params),
    (params) => httpClient.get(`${BASE_URL}/inventory/on-hand`, { params })
  ),

  getBillingReport: withDataSource(
    (params) => reportingMockApi.getBillingReport(params),
    (params) => httpClient.get(`${BASE_URL}/billing/summary`, { params })
  ),

  getAuditLogs: withDataSource(
    (params) => reportingMockApi.getAuditLogs(params),
    (params) => httpClient.get(`${BASE_URL}/audit`, { params })
  ),

  getReconResults: withDataSource(
    (params) => reportingMockApi.getReconResults(params),
    (params) => httpClient.get(`${BASE_URL}/reconciliation/results`, { params })
  ),

  getGoLiveGates: withDataSource(
    () => reportingMockApi.getGoLiveGates(),
    () => httpClient.get(`${BASE_URL}/go-live/status`)
  ),

  updateGoLiveGate: withDataSource(
    (id, data) => reportingMockApi.updateGoLiveGate(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/go-live/${id}`, data)
  ),
}
