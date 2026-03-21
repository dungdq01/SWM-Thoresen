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

  // ─── Allocation ──────────────────────────────────────────────────────────────
  getAllocations: (params = {}) =>
    httpClient.get('/outbound/allocation', { params }),

  allocateShipment: (id) =>
    httpClient.post(`/outbound/allocation/${id}/allocate`),

  unallocateShipment: (id) =>
    httpClient.post(`/outbound/allocation/${id}/unallocate`),

  // ─── Weighing ──────────────────────────────────────────────────────────────
  recordTareWeight: (data) =>
    httpClient.post('/outbound/weigh/tare', data),

  recordGrossWeight: (data) =>
    httpClient.post('/outbound/weigh/gross', data),

  getWeighingHistory: (params = {}) =>
    httpClient.get('/outbound/weigh/weighing-history', { params }),

  // ─── Approval ──────────────────────────────────────────────────────────────
  getPendingApprovals: (params = {}) =>
    httpClient.get('/outbound/approvals/pending', { params }),

  approveShipment: (data) =>
    httpClient.post('/outbound/approvals/approve', data),

  rejectShipment: (data) =>
    httpClient.post('/outbound/approvals/reject', data),

  // ─── Ship ──────────────────────────────────────────────────────────────────
  shipShipment: (id) =>
    httpClient.post(`/outbound/shipments/${id}/ship`),

  // ─── Outbound Documents ─────────────────────────────────────────────────────
  getOutboundDocuments: (params = {}) =>
    httpClient.get('/outbound/documents', { params }),
}
