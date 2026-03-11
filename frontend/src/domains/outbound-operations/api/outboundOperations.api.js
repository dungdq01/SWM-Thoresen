import { httpClient } from '@shared/api/httpClient'
import { outboundOperationsMockApi } from '@mocks/outboundOperations.mock'
import { isMockApiEnabled } from '@mocks/utils'

const BASE_URL = '/api/v1/outbound'

const withDataSource = (mockHandler, apiHandler) => (...args) => {
  return isMockApiEnabled() ? mockHandler(...args) : apiHandler(...args)
}

export const outboundOperationsApi = {
  getDashboardSummary: withDataSource(
    (warehouseId) => outboundOperationsMockApi.getDashboardSummary(warehouseId),
    (warehouseId) => httpClient.get(`${BASE_URL}/dashboard/summary`, { params: { warehouseId } })
  ),
  getShipments: withDataSource(
    (params) => outboundOperationsMockApi.getShipments(params),
    (params) => httpClient.get(`${BASE_URL}/shipments`, { params })
  ),
  getShipmentById: withDataSource(
    (id) => outboundOperationsMockApi.getShipmentById(id),
    (id) => httpClient.get(`${BASE_URL}/shipments/${id}`)
  ),
  getShipmentByNumber: withDataSource(
    (shipmentNumber) => outboundOperationsMockApi.getShipmentByNumber(shipmentNumber),
    (shipmentNumber) => httpClient.get(`${BASE_URL}/shipments/by-number/${shipmentNumber}`)
  ),
  getShipmentLines: withDataSource(
    (shipmentId) => outboundOperationsMockApi.getShipmentLines(shipmentId),
    (shipmentId) => httpClient.get(`${BASE_URL}/shipments/${shipmentId}/lines`)
  ),
  createShipment: withDataSource(
    (data) => outboundOperationsMockApi.createShipment(data),
    (data) => httpClient.post(`${BASE_URL}/shipments`, data)
  ),
  confirmShipment: withDataSource(
    (id) => outboundOperationsMockApi.confirmShipment(id),
    (id) => httpClient.post(`${BASE_URL}/shipments/${id}/confirm`)
  ),
  cancelShipment: withDataSource(
    (id, data) => outboundOperationsMockApi.cancelShipment(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/shipments/${id}/cancel`, data)
  ),
  allocateShipment: withDataSource(
    (id) => outboundOperationsMockApi.allocateShipment(id),
    (id) => httpClient.post(`${BASE_URL}/shipments/${id}/allocate`)
  ),
  unallocateShipment: withDataSource(
    (id) => outboundOperationsMockApi.unallocateShipment(id),
    (id) => httpClient.post(`${BASE_URL}/shipments/${id}/unallocate`)
  ),
  getAllocations: withDataSource(
    (id) => outboundOperationsMockApi.getAllocations(id),
    (id) => httpClient.get(`${BASE_URL}/shipments/${id}/allocations`)
  ),
  recordTare: withDataSource(
    (id, data) => outboundOperationsMockApi.recordTare(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/shipments/${id}/weigh/tare`, data)
  ),
  recordGross: withDataSource(
    (id, data) => outboundOperationsMockApi.recordGross(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/shipments/${id}/weigh/gross`, data)
  ),
  getWeighingHistory: withDataSource(
    (id) => outboundOperationsMockApi.getWeighingHistory(id),
    (id) => httpClient.get(`${BASE_URL}/shipments/${id}/weighing-history`)
  ),
  shipShipment: withDataSource(
    (id) => outboundOperationsMockApi.shipShipment(id),
    (id) => httpClient.post(`${BASE_URL}/shipments/${id}/ship`)
  ),
  getPendingApprovals: withDataSource(
    (warehouseId) => outboundOperationsMockApi.getPendingApprovals(warehouseId),
    (warehouseId) => httpClient.get(`${BASE_URL}/approvals/pending`, { params: { warehouseId } })
  ),
  approveShipment: withDataSource(
    (id, data) => outboundOperationsMockApi.approveShipment(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/shipments/${id}/approve`, data)
  ),
  rejectShipment: withDataSource(
    (id, data) => outboundOperationsMockApi.rejectShipment(id, data),
    (id, data) => httpClient.post(`${BASE_URL}/shipments/${id}/reject`, data)
  ),
  getShipmentHistory: withDataSource(
    (id) => outboundOperationsMockApi.getShipmentHistory(id),
    (id) => httpClient.get(`${BASE_URL}/shipments/${id}/history`)
  ),
  getShipmentExceptions: withDataSource(
    (id) => outboundOperationsMockApi.getShipmentExceptions(id),
    (id) => httpClient.get(`${BASE_URL}/shipments/${id}/exceptions`)
  ),

  // ── Sales Orders ──
  getSalesOrders: withDataSource(
    (params) => outboundOperationsMockApi.getSalesOrders(params),
    (params) => httpClient.get(`${BASE_URL}/sales-orders`, { params })
  ),
  getSalesOrderById: withDataSource(
    (id) => outboundOperationsMockApi.getSalesOrderById(id),
    (id) => httpClient.get(`${BASE_URL}/sales-orders/${id}`)
  ),
  createSalesOrder: withDataSource(
    (data) => outboundOperationsMockApi.createSalesOrder(data),
    (data) => httpClient.post(`${BASE_URL}/sales-orders`, data)
  ),
  updateSalesOrder: withDataSource(
    (id, data) => outboundOperationsMockApi.updateSalesOrder(id, data),
    (id, data) => httpClient.put(`${BASE_URL}/sales-orders/${id}`, data)
  ),
  confirmSalesOrder: withDataSource(
    (id) => outboundOperationsMockApi.confirmSalesOrder(id),
    (id) => httpClient.post(`${BASE_URL}/sales-orders/${id}/confirm`)
  ),
  closeSalesOrder: withDataSource(
    (id) => outboundOperationsMockApi.closeSalesOrder(id),
    (id) => httpClient.post(`${BASE_URL}/sales-orders/${id}/close`)
  ),
  cancelSalesOrder: withDataSource(
    (id) => outboundOperationsMockApi.cancelSalesOrder(id),
    (id) => httpClient.post(`${BASE_URL}/sales-orders/${id}/cancel`)
  ),
}
