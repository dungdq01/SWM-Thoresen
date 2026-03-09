import { httpClient } from '@shared/api/httpClient'
import { inventoryControlMockApi } from '@mocks/inventoryControl.mock'
import { isMockApiEnabled } from '@mocks/utils'

const BASE_URL = '/api/v1/inventory-control'

const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

export const inventoryControlApi = {
  getOnHand: withDataSource(
    (params) => inventoryControlMockApi.getOnHand(params),
    (params) => httpClient.get(`${BASE_URL}/on-hand`, { params })
  ),
  getOnHandByItem: withDataSource(
    (itemId, params) => inventoryControlMockApi.getOnHandByItem(itemId, params),
    (itemId, params) => httpClient.get(`${BASE_URL}/on-hand/item/${itemId}`, { params })
  ),
  getMovementHistory: withDataSource(
    (params) => inventoryControlMockApi.getMovementHistory(params),
    (params) => httpClient.get(`${BASE_URL}/movement-history`, { params })
  ),
  getMoveOrders: withDataSource(
    (params) => inventoryControlMockApi.getMoveOrders(params),
    (params) => httpClient.get(`${BASE_URL}/move-orders`, { params })
  ),
  getMoveOrderById: withDataSource(
    (id) => inventoryControlMockApi.getMoveOrderById(id),
    (id) => httpClient.get(`${BASE_URL}/move-orders/${id}`)
  ),
  createMoveOrder: withDataSource(
    (data) => inventoryControlMockApi.createMoveOrder(data),
    (data) => httpClient.post(`${BASE_URL}/move-orders`, data)
  ),
  confirmMoveOrder: withDataSource(
    (id) => inventoryControlMockApi.confirmMoveOrder(id),
    (id) => httpClient.post(`${BASE_URL}/move-orders/${id}/confirm`)
  ),
  executeMoveOrder: withDataSource(
    (id) => inventoryControlMockApi.executeMoveOrder(id),
    (id) => httpClient.post(`${BASE_URL}/move-orders/${id}/execute`)
  ),
  cancelMoveOrder: withDataSource(
    (id, data) => inventoryControlMockApi.cancelMoveOrder(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/move-orders/${id}/cancel`, data)
  ),
  getTransferOrders: withDataSource(
    (params) => inventoryControlMockApi.getTransferOrders(params),
    (params) => httpClient.get(`${BASE_URL}/transfer-orders`, { params })
  ),
  getTransferOrderById: withDataSource(
    (id) => inventoryControlMockApi.getTransferOrderById(id),
    (id) => httpClient.get(`${BASE_URL}/transfer-orders/${id}`)
  ),
  createTransferOrder: withDataSource(
    (data) => inventoryControlMockApi.createTransferOrder(data),
    (data) => httpClient.post(`${BASE_URL}/transfer-orders`, data)
  ),
  releaseTransferOrder: withDataSource(
    (id) => inventoryControlMockApi.releaseTransferOrder(id),
    (id) => httpClient.post(`${BASE_URL}/transfer-orders/${id}/release`)
  ),
  shipTransferOrder: withDataSource(
    (id, data) => inventoryControlMockApi.shipTransferOrder(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/transfer-orders/${id}/ship`, data)
  ),
  receiveTransferOrder: withDataSource(
    (id, data) => inventoryControlMockApi.receiveTransferOrder(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/transfer-orders/${id}/receive`, data)
  ),
  closeTransferOrder: withDataSource(
    (id, data) => inventoryControlMockApi.closeTransferOrder(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/transfer-orders/${id}/close`, data)
  ),
  cancelTransferOrder: withDataSource(
    (id, data) => inventoryControlMockApi.cancelTransferOrder(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/transfer-orders/${id}/cancel`, data)
  ),
  getStatusChanges: withDataSource(
    (params) => inventoryControlMockApi.getStatusChanges(params),
    (params) => httpClient.get(`${BASE_URL}/status-changes`, { params })
  ),
  createStatusChange: withDataSource(
    (data) => inventoryControlMockApi.createStatusChange(data),
    (data) => httpClient.post(`${BASE_URL}/status-changes`, data)
  ),
  getCycleCounts: withDataSource(
    (params) => inventoryControlMockApi.getCycleCounts(params),
    (params) => httpClient.get(`${BASE_URL}/cycle-counts`, { params })
  ),
  getCycleCountById: withDataSource(
    (id) => inventoryControlMockApi.getCycleCountById(id),
    (id) => httpClient.get(`${BASE_URL}/cycle-counts/${id}`)
  ),
  createCycleCount: withDataSource(
    (data) => inventoryControlMockApi.createCycleCount(data),
    (data) => httpClient.post(`${BASE_URL}/cycle-counts`, data)
  ),
  releaseCycleCount: withDataSource(
    (id) => inventoryControlMockApi.releaseCycleCount(id),
    (id) => httpClient.post(`${BASE_URL}/cycle-counts/${id}/release`)
  ),
  submitCycleCount: withDataSource(
    (id, data) => inventoryControlMockApi.submitCycleCount(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/cycle-counts/${id}/submit`, data)
  ),
  approveCycleCount: withDataSource(
    (id) => inventoryControlMockApi.approveCycleCount(id),
    (id) => httpClient.post(`${BASE_URL}/cycle-counts/${id}/approve`)
  ),
  postCycleCount: withDataSource(
    (id) => inventoryControlMockApi.postCycleCount(id),
    (id) => httpClient.post(`${BASE_URL}/cycle-counts/${id}/post`)
  ),
  getAdjustments: withDataSource(
    (params) => inventoryControlMockApi.getAdjustments(params),
    (params) => httpClient.get(`${BASE_URL}/adjustments`, { params })
  ),
  createAdjustment: withDataSource(
    (data) => inventoryControlMockApi.createAdjustment(data),
    (data) => httpClient.post(`${BASE_URL}/adjustments`, data)
  ),
  submitAdjustment: withDataSource(
    (id) => inventoryControlMockApi.submitAdjustment(id),
    (id) => httpClient.post(`${BASE_URL}/adjustments/${id}/submit`)
  ),
  approveAdjustment: withDataSource(
    (id) => inventoryControlMockApi.approveAdjustment(id),
    (id) => httpClient.post(`${BASE_URL}/adjustments/${id}/approve`)
  ),
  postAdjustment: withDataSource(
    (id) => inventoryControlMockApi.postAdjustment(id),
    (id) => httpClient.post(`${BASE_URL}/adjustments/${id}/post`)
  ),
}
