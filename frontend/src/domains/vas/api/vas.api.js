import { httpClient } from '@shared/api/httpClient'
import { vasMockApi } from '@mocks/vas.mock'
import { isMockApiEnabled } from '@mocks/utils'

const BASE_URL = '/vas-wo'

const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

export const vasApi = {
  getWorkOrders: withDataSource(
    (params) => vasMockApi.getWorkOrders(params),
    (params) => httpClient.get(`${BASE_URL}`, { params })
  ),
  getWorkOrderById: withDataSource(
    (id) => vasMockApi.getWorkOrderById(id),
    (id) => httpClient.get(`${BASE_URL}/${id}`)
  ),
  createWorkOrder: withDataSource(
    (data) => vasMockApi.createWorkOrder(data),
    (data) => httpClient.post(`${BASE_URL}`, data)
  ),
  confirmWorkOrder: withDataSource(
    (id) => vasMockApi.releaseWorkOrder?.(id) || vasMockApi.confirmWorkOrder?.(id),
    (id) => httpClient.post(`${BASE_URL}/${id}/confirm`)
  ),
  completeWorkOrder: withDataSource(
    (id, data) => vasMockApi.completeWorkOrder(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/${id}/complete`, data)
  ),
  cancelWorkOrder: withDataSource(
    (id, data) => vasMockApi.cancelWorkOrder(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/${id}/cancel`, data)
  ),
  addSession: withDataSource(
    (woId, data) => vasMockApi.startSession?.(data) || Promise.resolve({ data: {} }),
    (woId, data) => httpClient.post(`${BASE_URL}/${woId}/session`, data)
  ),
  getSessions: withDataSource(
    (woId) => vasMockApi.getSessions?.({ woId }) || Promise.resolve({ data: [] }),
    (woId) => httpClient.get(`${BASE_URL}/${woId}/sessions`)
  ),
  getDashboard: withDataSource(
    (params) => vasMockApi.getDashboard(params),
    (params) => httpClient.get(`${BASE_URL}`, { params })
  ),
}
