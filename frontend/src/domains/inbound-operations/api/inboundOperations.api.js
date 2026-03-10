import { httpClient } from '@shared/api/httpClient'
import { inboundOperationsMockApi } from '@mocks/inboundOperations.mock'
import { isMockApiEnabled } from '@mocks/utils'

const BASE_URL = '/inbound'

const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

export const inboundOperationsApi = {
  getDashboardSummary: withDataSource(
    () => inboundOperationsMockApi.getDashboardSummary(),
    () => httpClient.get(`${BASE_URL}/dashboard/summary`)
  ),
  getReceipts: withDataSource(
    (params) => inboundOperationsMockApi.getReceipts(params),
    (params) => httpClient.get(`${BASE_URL}/receipts`, { params })
  ),
  getReceiptById: withDataSource(
    (id) => inboundOperationsMockApi.getReceiptById(id),
    (id) => httpClient.get(`${BASE_URL}/receipts/${id}`)
  ),
  createReceipt: withDataSource(
    (data) => inboundOperationsMockApi.createReceipt(data),
    (data) => httpClient.post(`${BASE_URL}/receipts`, data)
  ),
  confirmReceipt: withDataSource(
    (id) => inboundOperationsMockApi.confirmReceipt(id),
    (id) => httpClient.post(`${BASE_URL}/receipts/${id}/confirm`)
  ),
  startProcessing: withDataSource(
    (id) => inboundOperationsMockApi.startProcessing(id),
    (id) => httpClient.post(`${BASE_URL}/receipts/${id}/start-processing`)
  ),
  recordWeighIn: withDataSource(
    (data) => inboundOperationsMockApi.recordWeighIn(data),
    (data) => httpClient.post(`${BASE_URL}/weigh-events/in`, data)
  ),
  recordWeighOut: withDataSource(
    (data) => inboundOperationsMockApi.recordWeighOut(data),
    (data) => httpClient.post(`${BASE_URL}/weigh-events/out`, data)
  ),
  applyManualWeight: withDataSource(
    (id, data) => inboundOperationsMockApi.applyManualWeight(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/receipts/${id}/manual-weight`, data)
  ),
  reweighReceipt: withDataSource(
    (id) => inboundOperationsMockApi.reweighReceipt(id),
    (id) => httpClient.post(`${BASE_URL}/receipts/${id}/reweigh`)
  ),
  cancelReceipt: withDataSource(
    (id, data) => inboundOperationsMockApi.cancelReceipt(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/receipts/${id}/cancel`, data)
  ),
  getExceptions: withDataSource(
    (params) => inboundOperationsMockApi.getExceptions(params),
    (params) => httpClient.get(`${BASE_URL}/receipts`, { params: { ...params, status: 'REJECTED,CANCELLED' } })
  ),
  getPutawayQueue: withDataSource(
    (params) => inboundOperationsMockApi.getPutawayQueue(params),
    (params) => httpClient.get(`${BASE_URL}/receipts`, { params: { ...params, status: 'RECEIVED' } })
  ),
  completePutaway: withDataSource(
    (id) => inboundOperationsMockApi.completePutaway(id),
    (id) => httpClient.post(`${BASE_URL}/receipts/${id}/close`)
  ),
  getReceiptHistory: withDataSource(
    (id) => inboundOperationsMockApi.getReceiptHistory(id),
    (id) => httpClient.get(`${BASE_URL}/receipts/${id}/history`)
  ),
  getWeighLogs: withDataSource(
    (id) => inboundOperationsMockApi.getWeighLogs(id),
    (id) => httpClient.get(`${BASE_URL}/receipts/${id}/history`)
  ),
}
