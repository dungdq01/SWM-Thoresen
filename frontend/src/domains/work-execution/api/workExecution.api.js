import { httpClient } from '@shared/api/httpClient'
import { workExecutionMockApi } from '@mocks/workExecution.mock'
import { isMockApiEnabled } from '@mocks/utils'

const BASE_URL = '/api/v1/work-execution'

const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

export const workExecutionApi = {
  getDashboardSummary: withDataSource(
    (warehouseId) => workExecutionMockApi.getDashboardSummary(warehouseId),
    (warehouseId) => httpClient.get(`${BASE_URL}/dashboard/summary`, { params: { warehouseId } })
  ),
  getWorks: withDataSource(
    (params) => workExecutionMockApi.getWorks(params),
    (params) => httpClient.get(`${BASE_URL}/works`, { params })
  ),
  getWorkById: withDataSource(
    (id) => workExecutionMockApi.getWorkById(id),
    (id) => httpClient.get(`${BASE_URL}/works/${id}`)
  ),
  getWorkHistory: withDataSource(
    (id) => workExecutionMockApi.getWorkHistory(id),
    (id) => httpClient.get(`${BASE_URL}/works/${id}/history`)
  ),
  getWorkExceptions: withDataSource(
    (id) => workExecutionMockApi.getWorkExceptions(id),
    (id) => httpClient.get(`${BASE_URL}/works/${id}/exceptions`)
  ),
  getAvailableWorks: withDataSource(
    (params) => workExecutionMockApi.getAvailableWorks(params),
    (params) => httpClient.get(`${BASE_URL}/works/available`, { params })
  ),
  getMyWorks: withDataSource(
    (params) => workExecutionMockApi.getMyWorks(params),
    (params) => httpClient.get(`${BASE_URL}/works/my`, { params })
  ),
  generateWork: withDataSource(
    (data) => workExecutionMockApi.generateWork(data),
    (data) => httpClient.post(`${BASE_URL}/works/generate`, data)
  ),
  claimWork: withDataSource(
    (id, data) => workExecutionMockApi.claimWork(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/works/${id}/claim`, data)
  ),
  releaseWork: withDataSource(
    (id, data) => workExecutionMockApi.releaseWork(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/works/${id}/release`, data)
  ),
  startWork: withDataSource(
    (id, data) => workExecutionMockApi.startWork(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/works/${id}/start`, data)
  ),
  startLine: withDataSource(
    (workId, lineId, data) => workExecutionMockApi.startLine(workId, lineId, data),
    (workId, lineId, data) => httpClient.post(`${BASE_URL}/works/${workId}/lines/${lineId}/start`, data)
  ),
  completeLine: withDataSource(
    (workId, lineId, data) => workExecutionMockApi.completeLine(workId, lineId, data),
    (workId, lineId, data) => httpClient.post(`${BASE_URL}/works/${workId}/lines/${lineId}/complete`, data)
  ),
  skipLine: withDataSource(
    (workId, lineId, data) => workExecutionMockApi.skipLine(workId, lineId, data),
    (workId, lineId, data) => httpClient.post(`${BASE_URL}/works/${workId}/lines/${lineId}/skip`, data)
  ),
  cancelWork: withDataSource(
    (id, data) => workExecutionMockApi.cancelWork(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/works/${id}/cancel`, data)
  ),
  validateScan: withDataSource(
    (data) => workExecutionMockApi.validateScan(data),
    (data) => httpClient.post(`${BASE_URL}/scan/validate`, data)
  ),
}
