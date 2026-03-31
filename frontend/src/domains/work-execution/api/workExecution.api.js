import { httpClient } from '@shared/api/httpClient'

const BASE_WORKS = '/works'
const BASE_MOBILE = '/mobile'
const BASE_INTERNAL = '/internal'

export const workExecutionApi = {
  getDashboardSummary: (warehouseId) => httpClient.get(`${BASE_WORKS}/dashboard/summary`, { params: { warehouseId } }),
  getWorks: (params) => httpClient.get(`${BASE_WORKS}`, { params }),
  getWorkById: (id) => httpClient.get(`${BASE_WORKS}/${id}`),
  getWorkHistory: (id) => httpClient.get(`${BASE_WORKS}/${id}/history`),
  getWorkExceptions: (id) => httpClient.get(`${BASE_WORKS}/${id}/exceptions`),
  getAvailableWorks: (params) => httpClient.get(`${BASE_MOBILE}/works/available`, { params }),
  getMyWorks: (params) => httpClient.get(`${BASE_WORKS}/my`, { params }),
  generateWork: (data) => httpClient.post(`${BASE_INTERNAL}/works/generate`, data),
  claimWork: (id, data) => httpClient.post(`${BASE_WORKS}/${id}/claim`, data),
  releaseWork: (id, data) => httpClient.post(`${BASE_WORKS}/${id}/release`, data),
  startWork: (id, data) => httpClient.post(`${BASE_WORKS}/${id}/start`, data),
  startLine: (workId, lineNum, data) => httpClient.post(`${BASE_WORKS}/${workId}/lines/${lineNum}/start`, data),
  completeLine: (workId, lineNum, data) => httpClient.post(`${BASE_WORKS}/${workId}/lines/${lineNum}/complete`, data),
  skipLine: (workId, lineNum, data) => httpClient.post(`${BASE_WORKS}/${workId}/lines/${lineNum}/skip`, data),
  cancelWork: (id, data) => httpClient.post(`${BASE_WORKS}/${id}/cancel`, data),
  validateScan: (data) => httpClient.post(`${BASE_MOBILE}/scan/validate`, data),
}
