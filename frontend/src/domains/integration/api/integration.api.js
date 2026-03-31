import { httpClient } from '@shared/api/httpClient'

const BASE_URL = '/integration'

export const integrationApi = {
  getOverview: () => httpClient.get(`${BASE_URL}/monitoring/overview`),
  getChannelHealth: () => httpClient.get(`${BASE_URL}/monitoring/channel-health`),
  getDetailedStats: () => httpClient.get(`${BASE_URL}/monitoring/stats`),
  getAlerts: (params) => httpClient.get(`${BASE_URL}/alerts`, { params }),
  getAlertById: (id) => httpClient.get(`${BASE_URL}/alerts/${id}`),
  acknowledgeAlert: (id, data) => httpClient.post(`${BASE_URL}/alerts/${id}/acknowledge`, data),
  resolveAlert: (id, data) => httpClient.post(`${BASE_URL}/alerts/${id}/resolve`, data),
  getWeighbridgeLogs: (params) => httpClient.get(`${BASE_URL}/weighbridge/logs`, { params }),
  getWeighbridgeDevices: (params) => httpClient.get(`${BASE_URL}/weighbridge/devices`, { params }),
  reprocessWeighEvent: (id, data) => httpClient.post(`${BASE_URL}/weighbridge/events/${id}/reprocess`, data),
  createWeighEvent: (data) => httpClient.post(`${BASE_URL}/weighbridge/events/manual`, data),
  updateWeighLog: (id, data) => httpClient.patch(`${BASE_URL}/weighbridge/logs/${id}`, data),
  confirmWeighLog: (id) => httpClient.post(`${BASE_URL}/weighbridge/logs/${id}/confirm`),
  rejectWeighLog: (id, data) => httpClient.post(`${BASE_URL}/weighbridge/logs/${id}/reject`, data),
  recordWeight: (id, data) => httpClient.post(`${BASE_URL}/weighbridge/logs/${id}/record-weight`, data),
  deleteWeighLog: (id) => httpClient.delete(`${BASE_URL}/weighbridge/logs/${id}`),

  // OCR APIs
  uploadOcrImage: (formData) => httpClient.post(`${BASE_URL}/ocr/uploads`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getOcrResults: (params) => httpClient.get(`${BASE_URL}/ocr/results`, { params }),
  getOcrResultById: (id) => httpClient.get(`${BASE_URL}/ocr/results/${id}`),
  confirmOcrResult: (id, data) => httpClient.post(`${BASE_URL}/ocr/results/${id}/confirm`, data),
  rejectOcrResult: (id, data) => httpClient.post(`${BASE_URL}/ocr/results/${id}/reject`, data),
}
