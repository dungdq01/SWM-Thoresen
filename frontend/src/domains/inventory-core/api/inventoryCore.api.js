import { httpClient } from '@shared/api/httpClient'
import { inventoryCoreMockApi } from '@mocks/inventoryCore.mock'
import { isMockApiEnabled } from '@mocks/utils'

const BASE_URL = '/inventory'

const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

export const inventoryCoreApi = {
  getOnHand: withDataSource(
    (params) => inventoryCoreMockApi.getOnHand(params),
    (params) => httpClient.get(`${BASE_URL}/onhand`, { params })
  ),
  getAvailability: withDataSource(
    (params) => inventoryCoreMockApi.getAvailability(params),
    (params) => httpClient.get(`${BASE_URL}/onhand/availability`, { params })
  ),
  getTransactions: withDataSource(
    (params) => inventoryCoreMockApi.getTransactions(params),
    (params) => httpClient.get(`${BASE_URL}/transactions`, { params })
  ),
  getTransactionById: withDataSource(
    (transId) => inventoryCoreMockApi.getTransactionById(transId),
    (transId) => httpClient.get(`${BASE_URL}/transactions/${transId}`)
  ),
  createPosting: withDataSource(
    (data) => inventoryCoreMockApi.createPosting(data),
    (data) => httpClient.post(`${BASE_URL}/postings`, data)
  ),
  reversePosting: withDataSource(
    (data) => inventoryCoreMockApi.reversePosting(data),
    (data) => httpClient.post(`${BASE_URL}/postings/reverse`, data)
  ),
  getHolds: withDataSource(
    (params) => inventoryCoreMockApi.getHolds(params),
    (params) => httpClient.get(`${BASE_URL}/holds`, { params })
  ),
  createHold: withDataSource(
    (data) => inventoryCoreMockApi.createHold(data),
    (data) => httpClient.post(`${BASE_URL}/holds`, data)
  ),
  releaseHold: withDataSource(
    (holdId, data) => inventoryCoreMockApi.releaseHold(holdId, data),
    (holdId, data) => httpClient.post(`${BASE_URL}/holds/${holdId}/release`, data)
  ),
  cancelHold: withDataSource(
    (holdId, data) => inventoryCoreMockApi.cancelHold(holdId, data),
    (holdId, data) => httpClient.post(`${BASE_URL}/holds/${holdId}/cancel`, data)
  ),
}
