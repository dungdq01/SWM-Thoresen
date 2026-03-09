import { httpClient } from '@shared/api/httpClient'
import { vasMockApi } from '@mocks/vas.mock'
import { isMockApiEnabled } from '@mocks/utils'

const BASE_URL = '/api/v1/vas'

const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

export const vasApi = {
  getWorkOrders: withDataSource(
    (params) => vasMockApi.getWorkOrders(params),
    (params) => httpClient.get(`${BASE_URL}/work-orders`, { params })
  ),
  getWorkOrderById: withDataSource(
    (id) => vasMockApi.getWorkOrderById(id),
    (id) => httpClient.get(`${BASE_URL}/work-orders/${id}`)
  ),
  createWorkOrder: withDataSource(
    (data) => vasMockApi.createWorkOrder(data),
    (data) => httpClient.post(`${BASE_URL}/work-orders`, data)
  ),
  releaseWorkOrder: withDataSource(
    (id) => vasMockApi.releaseWorkOrder(id),
    (id) => httpClient.post(`${BASE_URL}/work-orders/${id}/release`)
  ),
  startWorkOrder: withDataSource(
    (id) => vasMockApi.startWorkOrder(id),
    (id) => httpClient.post(`${BASE_URL}/work-orders/${id}/start`)
  ),
  completeWorkOrder: withDataSource(
    (id, data) => vasMockApi.completeWorkOrder(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/work-orders/${id}/complete`, data)
  ),
  cancelWorkOrder: withDataSource(
    (id, data) => vasMockApi.cancelWorkOrder(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/work-orders/${id}/cancel`, data)
  ),
  getSessions: withDataSource(
    (params) => vasMockApi.getSessions(params),
    (params) => httpClient.get(`${BASE_URL}/sessions`, { params })
  ),
  startSession: withDataSource(
    (data) => vasMockApi.startSession(data),
    (data) => httpClient.post(`${BASE_URL}/sessions/start`, data)
  ),
  endSession: withDataSource(
    (id) => vasMockApi.endSession(id),
    (id) => httpClient.post(`${BASE_URL}/sessions/${id}/end`)
  ),
  recordBag: withDataSource(
    (sessionId, data) => vasMockApi.recordBag(sessionId, data),
    (sessionId, data) => httpClient.post(`${BASE_URL}/sessions/${sessionId}/bags`, data)
  ),
  getDashboard: withDataSource(
    (params) => vasMockApi.getDashboard(params),
    (params) => httpClient.get(`${BASE_URL}/dashboard`, { params })
  ),
}
