import { httpClient } from '@shared/api/httpClient'
import { workExecutionMockApi } from '@mocks/workExecution.mock'
import { isMockApiEnabled } from '@mocks/utils'

const BASE_WORKS = '/works'
const BASE_MOBILE = '/mobile'
const BASE_INTERNAL = '/internal'

const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

export const workExecutionApi = {
  getDashboardSummary: withDataSource(
    (warehouseId) => workExecutionMockApi.getDashboardSummary(warehouseId),
    (warehouseId) => httpClient.get(`${BASE_WORKS}/dashboard/summary`, { params: { warehouseId } })
  ),
  getWorks: withDataSource(
    (params) => workExecutionMockApi.getWorks(params),
    (params) => httpClient.get(`${BASE_WORKS}`, { params })
  ),
  getWorkById: withDataSource(
    (id) => workExecutionMockApi.getWorkById(id),
    (id) => httpClient.get(`${BASE_WORKS}/${id}`)
  ),
  getWorkHistory: withDataSource(
    (id) => workExecutionMockApi.getWorkHistory(id),
    (id) => httpClient.get(`${BASE_WORKS}/${id}/history`)
  ),
  getWorkExceptions: withDataSource(
    (id) => workExecutionMockApi.getWorkExceptions(id),
    (id) => httpClient.get(`${BASE_WORKS}/${id}/exceptions`)
  ),
  getAvailableWorks: withDataSource(
    (params) => workExecutionMockApi.getAvailableWorks(params),
    (params) => httpClient.get(`${BASE_MOBILE}/works/available`, { params })
  ),
  getMyWorks: withDataSource(
    (params) => workExecutionMockApi.getMyWorks(params),
    (params) => httpClient.get(`${BASE_WORKS}/my`, { params })
  ),
  generateWork: withDataSource(
    (data) => workExecutionMockApi.generateWork(data),
    (data) => httpClient.post(`${BASE_INTERNAL}/works/generate`, data)
  ),
  claimWork: withDataSource(
    (id, data) => workExecutionMockApi.claimWork(id, data),
    (id, data) => httpClient.post(`${BASE_WORKS}/${id}/claim`, data)
  ),
  releaseWork: withDataSource(
    (id, data) => workExecutionMockApi.releaseWork(id, data),
    (id, data) => httpClient.post(`${BASE_WORKS}/${id}/release`, data)
  ),
  startWork: withDataSource(
    (id, data) => workExecutionMockApi.startWork(id, data),
    (id, data) => httpClient.post(`${BASE_WORKS}/${id}/start`, data)
  ),
  startLine: withDataSource(
    (workId, lineId, data) => workExecutionMockApi.startLine(workId, lineId, data),
    (workId, lineNum, data) => httpClient.post(`${BASE_WORKS}/${workId}/lines/${lineNum}/start`, data)
  ),
  completeLine: withDataSource(
    (workId, lineNum, data) => workExecutionMockApi.completeLine(workId, lineNum, data),
    (workId, lineNum, data) => httpClient.post(`${BASE_WORKS}/${workId}/lines/${lineNum}/complete`, data)
  ),
  skipLine: withDataSource(
    (workId, lineNum, data) => workExecutionMockApi.skipLine(workId, lineNum, data),
    (workId, lineNum, data) => httpClient.post(`${BASE_WORKS}/${workId}/lines/${lineNum}/skip`, data)
  ),
  cancelWork: withDataSource(
    (id, data) => workExecutionMockApi.cancelWork(id, data),
    (id, data) => httpClient.post(`${BASE_WORKS}/${id}/cancel`, data)
  ),
  validateScan: withDataSource(
    (data) => workExecutionMockApi.validateScan(data),
    (data) => httpClient.post(`${BASE_MOBILE}/scan/validate`, data)
  ),
}
