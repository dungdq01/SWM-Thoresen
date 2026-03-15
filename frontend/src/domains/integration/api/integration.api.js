import { httpClient } from '@shared/api/httpClient'
import { integrationMockApi } from '@mocks/integration.mock'
import { isMockApiEnabled } from '@mocks/utils'

const BASE_URL = '/integration'

const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

export const integrationApi = {
  getOverview: withDataSource(
    () => integrationMockApi.getOverview(),
    () => httpClient.get(`${BASE_URL}/monitoring/overview`)
  ),
  getChannelHealth: withDataSource(
    () => integrationMockApi.getChannelHealth(),
    () => httpClient.get(`${BASE_URL}/monitoring/channel-health`)
  ),
  getDetailedStats: withDataSource(
    () => integrationMockApi.getDetailedStats(),
    () => httpClient.get(`${BASE_URL}/monitoring/stats`)
  ),
  getAlerts: withDataSource(
    (params) => integrationMockApi.getAlerts(params),
    (params) => httpClient.get(`${BASE_URL}/alerts`, { params })
  ),
  getAlertById: withDataSource(
    (id) => integrationMockApi.getAlertById(id),
    (id) => httpClient.get(`${BASE_URL}/alerts/${id}`)
  ),
  acknowledgeAlert: withDataSource(
    (id, data) => integrationMockApi.acknowledgeAlert(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/alerts/${id}/acknowledge`, data)
  ),
  resolveAlert: withDataSource(
    (id, data) => integrationMockApi.resolveAlert(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/alerts/${id}/resolve`, data)
  ),
  getWeighbridgeLogs: withDataSource(
    (params) => integrationMockApi.getWeighbridgeLogs(params),
    (params) => httpClient.get(`${BASE_URL}/weighbridge/logs`, { params })
  ),
  getWeighbridgeDevices: withDataSource(
    (params) => integrationMockApi.getWeighbridgeDevices(params),
    (params) => httpClient.get(`${BASE_URL}/weighbridge/devices`, { params })
  ),
  reprocessWeighEvent: withDataSource(
    (id, data) => integrationMockApi.reprocessWeighEvent(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/weighbridge/events/${id}/reprocess`, data)
  ),

  // OCR APIs
  uploadOcrImage: withDataSource(
    (formData) => integrationMockApi.uploadOcrImage(formData),
    (formData) => httpClient.post(`${BASE_URL}/ocr/uploads`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  ),
  getOcrResults: withDataSource(
    (params) => integrationMockApi.getOcrResults(params),
    (params) => httpClient.get(`${BASE_URL}/ocr/results`, { params })
  ),
  getOcrResultById: withDataSource(
    (id) => integrationMockApi.getOcrResultById(id),
    (id) => httpClient.get(`${BASE_URL}/ocr/results/${id}`)
  ),
  confirmOcrResult: withDataSource(
    (id, data) => integrationMockApi.confirmOcrResult(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/ocr/results/${id}/confirm`, data)
  ),
  rejectOcrResult: withDataSource(
    (id, data) => integrationMockApi.rejectOcrResult(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/ocr/results/${id}/reject`, data)
  ),
}
