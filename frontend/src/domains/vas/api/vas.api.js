import { httpClient } from '@shared/api/httpClient'

const BASE_URL = '/vas-wo'

export const vasApi = {
  getWorkOrders: (params) => httpClient.get(`${BASE_URL}`, { params }),
  getWorkOrderById: (id) => httpClient.get(`${BASE_URL}/${id}`),
  createWorkOrder: (data) => httpClient.post(`${BASE_URL}`, data),
  confirmWorkOrder: (id) => httpClient.post(`${BASE_URL}/${id}/confirm`),
  completeWorkOrder: (id, data) => httpClient.post(`${BASE_URL}/${id}/complete`, data),
  cancelWorkOrder: (id, data) => httpClient.post(`${BASE_URL}/${id}/cancel`, data),
  addSession: (woId, data) => httpClient.post(`${BASE_URL}/${woId}/session`, data),
  getSessions: (woId) => httpClient.get(`${BASE_URL}/${woId}/sessions`),
  getDashboard: (params) => httpClient.get(`${BASE_URL}/dashboard`, { params }),
}
