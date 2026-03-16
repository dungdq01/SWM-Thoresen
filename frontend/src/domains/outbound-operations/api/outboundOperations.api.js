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

  getNextSoNumber: () =>
    httpClient.get('/outbound/sales-orders/next-number'),
}
