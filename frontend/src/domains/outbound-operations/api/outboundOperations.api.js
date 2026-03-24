/**
 * Outbound Operations API
 * 
 * Sales Order (SO) API endpoints
 */

import { httpClient } from '@shared/api'

export const outboundOperationsApi = {
  // ─── Sales Orders ───────────────────────────────────────────────────────────
  getSalesOrders: (params = {}) =>
    httpClient.get('/outbound/sales-orders', { params }),

  getSalesOrderById: (id) =>
    httpClient.get(`/outbound/sales-orders/${id}`),

  createSalesOrder: (data) =>
    httpClient.post('/outbound/sales-orders', data),

  updateSalesOrder: (id, data) =>
    httpClient.patch(`/outbound/sales-orders/${id}`, data),

  confirmSalesOrder: (id) =>
    httpClient.post(`/outbound/sales-orders/${id}/confirm`),

  cancelSalesOrder: (id, data) =>
    httpClient.post(`/outbound/sales-orders/${id}/cancel`, data),

  closeSalesOrder: (id) =>
    httpClient.post(`/outbound/sales-orders/${id}/close`),

  unconfirmSalesOrder: (id) =>
    httpClient.post(`/outbound/sales-orders/${id}/unconfirm`),

  getNextSoNumber: () =>
    httpClient.get('/outbound/sales-orders/next-number'),

  // ─── Shipments ────────────────────────────────────────────────────────────
  getShipments: (params = {}) =>
    httpClient.get('/outbound/shipments', { params }),

  getShipmentById: (id) =>
    httpClient.get(`/outbound/shipments/${id}`),

  createShipment: (data) =>
    httpClient.post('/outbound/shipments', data),

  updateShipment: (id, data) =>
    httpClient.patch(`/outbound/shipments/${id}`, data),

  confirmShipment: (id) =>
    httpClient.post(`/outbound/shipments/${id}/confirm`),

  deleteShipment: (id) =>
    httpClient.delete(`/outbound/shipments/${id}`),

  reportShipmentError: (id, reasonCode) =>
    httpClient.post(`/outbound/shipments/${id}/report-error`, { reasonCode }),

  // ─── Ship ──────────────────────────────────────────────────────────────────
  shipShipment: (id) =>
    httpClient.post(`/outbound/shipments/${id}/ship`),

  // ─── Loading (Xếp hàng) ────────────────────────────────────────────────────
  getShipmentsForLoading: (params = {}) =>
    httpClient.get('/outbound/loading/shipments', { params }),

  getLoadingStatus: (id) =>
    httpClient.get(`/outbound/loading/${id}/status`),

  startLoading: (id) =>
    httpClient.post(`/outbound/loading/${id}/start`),

  getLocationsWithStock: (shipmentId, itemId) =>
    httpClient.get(`/outbound/loading/${shipmentId}/locations-with-stock`, { params: { itemId } }),

  loadItem: (id, shipmentLineId, locationId) =>
    httpClient.post(`/outbound/loading/${id}/load-item`, { shipmentLineId, locationId }),

  unloadItem: (id, shipmentLineId) =>
    httpClient.post(`/outbound/loading/${id}/unload-item`, { shipmentLineId }),

  completeLoading: (id) =>
    httpClient.post(`/outbound/loading/${id}/complete`),

  // ─── Outbound Documents ─────────────────────────────────────────────────────
  getOutboundDocuments: (params = {}) =>
    httpClient.get('/outbound/documents', { params }),
}
