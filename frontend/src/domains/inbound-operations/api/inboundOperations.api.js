import { httpClient } from '@shared/api/httpClient'

const BASE_URL = '/inbound'

export const inboundOperationsApi = {
  getDashboardSummary: () => httpClient.get(`${BASE_URL}/dashboard/summary`),
  getReceipts: (params) => httpClient.get(`${BASE_URL}/receipts`, { params }),
  getReceiptById: (id) => httpClient.get(`${BASE_URL}/receipts/${id}`),
  createReceipt: (data) => httpClient.post(`${BASE_URL}/receipts`, data),
  updateReceipt: (id, data) => httpClient.put(`${BASE_URL}/receipts/${id}`, data),
  deleteReceipt: (id) => httpClient.delete(`${BASE_URL}/receipts/${id}`),
  confirmReceipt: (id) => httpClient.post(`${BASE_URL}/receipts/${id}/confirm`),
  startProcessing: (id) => httpClient.post(`${BASE_URL}/receipts/${id}/start-processing`),
  recordWeighIn: (data) => httpClient.post(`${BASE_URL}/weigh-events/in`, data),
  recordWeighOut: (data) => httpClient.post(`${BASE_URL}/weigh-events/out`, data),
  applyManualWeight: (id, data) => httpClient.post(`${BASE_URL}/receipts/${id}/manual-weight`, data),
  reweighReceipt: (id) => httpClient.post(`${BASE_URL}/receipts/${id}/reweigh`),
  cancelReceipt: (id, data) => httpClient.post(`${BASE_URL}/receipts/${id}/cancel`, data),
  getExceptions: (params) => httpClient.get(`${BASE_URL}/receipts`, { params: { ...params, status: 'REJECTED,CANCELLED' } }),
  getPutawayQueue: (params) => httpClient.get(`${BASE_URL}/receipts`, { params: { ...params, status: 'COMPLETED,CLOSED' } }),
  completePutaway: (id, data) => httpClient.post(`${BASE_URL}/receipts/${id}/putaway-complete`, data),
  closeReceipt: (id) => httpClient.post(`${BASE_URL}/receipts/${id}/close`),
  reportErrorReceipt: (id, data) => httpClient.post(`${BASE_URL}/receipts/${id}/report-error`, data),
  getReceiptHistory: (id) => httpClient.get(`${BASE_URL}/receipts/${id}/history`),
  getWeighLogs: (id) => httpClient.get(`${BASE_URL}/receipts/${id}/history`),

  // ── Purchase Orders ──
  getPurchaseOrders: (params) => httpClient.get(`${BASE_URL}/purchase-orders`, { params }),
  getPurchaseOrderById: (id) => httpClient.get(`${BASE_URL}/purchase-orders/${id}`),
  getNextPoNumber: () => httpClient.get(`${BASE_URL}/purchase-orders/next-number`),
  createPurchaseOrder: (data) => httpClient.post(`${BASE_URL}/purchase-orders`, data),
  updatePurchaseOrder: (id, data) => httpClient.put(`${BASE_URL}/purchase-orders/${id}`, data),
  confirmPurchaseOrder: (id) => httpClient.post(`${BASE_URL}/purchase-orders/${id}/confirm`),
  unconfirmPurchaseOrder: (id) => httpClient.post(`${BASE_URL}/purchase-orders/${id}/unconfirm`),
  closePurchaseOrder: (id) => httpClient.post(`${BASE_URL}/purchase-orders/${id}/close`),
  cancelPurchaseOrder: (id) => httpClient.post(`${BASE_URL}/purchase-orders/${id}/cancel`),

  // ── Unloading ──
  getReceiptsForUnloading: (params = {}) => httpClient.get(`${BASE_URL}/unloading/receipts`, { params }),
  getUnloadingStatus: (id) => httpClient.get(`${BASE_URL}/unloading/${id}/status`),
  getAvailableLocations: (receiptId) => httpClient.get(`${BASE_URL}/unloading/${receiptId}/locations-available`),
  startUnloading: (id) => httpClient.post(`${BASE_URL}/unloading/${id}/start`),
  unloadItem: (id, receiptLineId, locationId) => httpClient.post(`${BASE_URL}/unloading/${id}/unload-item`, { receiptLineId, locationId }),
  undoUnloadItem: (id, receiptLineId) => httpClient.post(`${BASE_URL}/unloading/${id}/undo-unload-item`, { receiptLineId }),
  completeUnloading: (id) => httpClient.post(`${BASE_URL}/unloading/${id}/complete`),
}
