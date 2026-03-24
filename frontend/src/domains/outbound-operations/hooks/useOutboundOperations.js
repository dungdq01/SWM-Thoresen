/**
 * Outbound Operations Hooks
 * 
 * Sales Order (SO) hooks using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { outboundOperationsApi } from '../api/outboundOperations.api'

export const OUTBOUND_QUERY_KEYS = {
  salesOrders: ['outbound', 'sales-orders'],
  salesOrder: (id) => ['outbound', 'sales-orders', id],
  nextSoNumber: ['outbound', 'sales-orders', 'next-number'],
  shipments: ['outbound', 'shipments'],
  shipment: (id) => ['outbound', 'shipments', id],
  loadingShipments: ['outbound', 'loading', 'shipments'],
  loadingStatus: (id) => ['outbound', 'loading', id],
  locationsWithStock: (shipmentId, itemId) => ['outbound', 'loading', shipmentId, 'locations', itemId],
}

// ─── Sales Orders ─────────────────────────────────────────────────────────────

export function useSalesOrders(params = {}) {
  return useQuery({
    queryKey: [...OUTBOUND_QUERY_KEYS.salesOrders, params],
    queryFn: () => outboundOperationsApi.getSalesOrders(params),
    staleTime: 15000,
  })
}

export function useSalesOrderById(id) {
  return useQuery({
    queryKey: OUTBOUND_QUERY_KEYS.salesOrder(id),
    queryFn: () => outboundOperationsApi.getSalesOrderById(id),
    enabled: !!id,
  })
}

export function useNextSoNumber(enabled = true) {
  return useQuery({
    queryKey: OUTBOUND_QUERY_KEYS.nextSoNumber,
    queryFn: () => outboundOperationsApi.getNextSoNumber(),
    select: (res) => res?.code || res,
    enabled,
    staleTime: 0,
  })
}

export function useCreateSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => outboundOperationsApi.createSalesOrder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.salesOrders })
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.nextSoNumber })
      toast.success('Tạo đơn xuất hàng thành công')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi tạo đơn xuất hàng')
    },
  })
}

export function useUpdateSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => outboundOperationsApi.updateSalesOrder(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.salesOrders })
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.salesOrder(id) })
      toast.success('Cập nhật đơn xuất hàng thành công')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi cập nhật đơn xuất hàng')
    },
  })
}

export function useConfirmSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => outboundOperationsApi.confirmSalesOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.salesOrders })
      toast.success('Xác nhận đơn xuất hàng thành công')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi xác nhận đơn xuất hàng')
    },
  })
}

export function useCancelSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => outboundOperationsApi.cancelSalesOrder(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.salesOrders })
      toast.success('Hủy đơn xuất hàng thành công')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi hủy đơn xuất hàng')
    },
  })
}

export function useCloseSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => outboundOperationsApi.closeSalesOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.salesOrders })
      toast.success('Đóng đơn xuất hàng thành công')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi đóng đơn xuất hàng')
    },
  })
}

export function useUnconfirmSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => outboundOperationsApi.unconfirmSalesOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.salesOrders })
      toast.success('Hủy xác nhận thành công')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi hủy xác nhận')
    },
  })
}

// ─── Shipments ────────────────────────────────────────────────────────────────

export function useShipments(params = {}) {
  return useQuery({
    queryKey: [...OUTBOUND_QUERY_KEYS.shipments, params],
    queryFn: () => outboundOperationsApi.getShipments(params),
    staleTime: 15000,
  })
}

export function useShipmentById(id) {
  return useQuery({
    queryKey: OUTBOUND_QUERY_KEYS.shipment(id),
    queryFn: () => outboundOperationsApi.getShipmentById(id),
    enabled: !!id,
  })
}

export function useCreateShipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => outboundOperationsApi.createShipment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.shipments })
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.salesOrders })
      toast.success('Tạo phiếu xuất thành công')
    },
    onError: () => {
      // Error displayed inline in form via errorMessage prop
    },
  })
}

export function useUpdateShipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => outboundOperationsApi.updateShipment(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.shipments })
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.shipment(id) })
      toast.success('Cập nhật phiếu xuất thành công')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi cập nhật phiếu xuất')
    },
  })
}

export function useConfirmShipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => outboundOperationsApi.confirmShipment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.shipments })
      toast.success('Xác nhận phiếu xuất thành công')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi xác nhận phiếu xuất')
    },
  })
}

export function useDeleteShipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => outboundOperationsApi.deleteShipment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.shipments })
      toast.success('Xóa phiếu xuất thành công')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi xóa phiếu xuất')
    },
  })
}

export function useReportShipmentError() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reasonCode }) => outboundOperationsApi.reportShipmentError(id, reasonCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.shipments })
      toast.success('Báo lỗi phiếu xuất thành công')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi báo lỗi phiếu xuất')
    },
  })
}

// ─── Ship ────────────────────────────────────────────────────────────────────

export function useShipShipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => outboundOperationsApi.shipShipment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.shipments })
      toast.success('Xuất hàng thành công')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi xuất hàng')
    },
  })
}

// ─── Loading (Xếp hàng) ─────────────────────────────────────────────────────

export function useShipmentsForLoading(params = {}) {
  return useQuery({
    queryKey: [...OUTBOUND_QUERY_KEYS.loadingShipments, params],
    queryFn: () => outboundOperationsApi.getShipmentsForLoading(params),
    staleTime: 10000,
  })
}

export function useLoadingStatus(shipmentId) {
  return useQuery({
    queryKey: OUTBOUND_QUERY_KEYS.loadingStatus(shipmentId),
    queryFn: () => outboundOperationsApi.getLoadingStatus(shipmentId),
    enabled: !!shipmentId,
    staleTime: 5000,
  })
}

export function useStartLoading() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (shipmentId) => outboundOperationsApi.startLoading(shipmentId),
    onSuccess: (_, shipmentId) => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.loadingShipments })
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.loadingStatus(shipmentId) })
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.shipments })
      toast.success('Bắt đầu xếp hàng')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi bắt đầu xếp hàng')
    },
  })
}

export function useLocationsWithStock(shipmentId, itemId) {
  return useQuery({
    queryKey: OUTBOUND_QUERY_KEYS.locationsWithStock(shipmentId, itemId),
    queryFn: () => outboundOperationsApi.getLocationsWithStock(shipmentId, itemId),
    enabled: !!shipmentId && !!itemId,
    staleTime: 5000,
  })
}

export function useLoadItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ shipmentId, shipmentLineId, locationId }) =>
      outboundOperationsApi.loadItem(shipmentId, shipmentLineId, locationId),
    onSuccess: (_, { shipmentId }) => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.loadingStatus(shipmentId) })
      toast.success('Đã xếp hàng lên xe')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi xếp hàng')
    },
  })
}

export function useUnloadItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ shipmentId, shipmentLineId }) =>
      outboundOperationsApi.unloadItem(shipmentId, shipmentLineId),
    onSuccess: (_, { shipmentId }) => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.loadingStatus(shipmentId) })
      toast.success('Đã bỏ xếp')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi bỏ xếp')
    },
  })
}

export function useCompleteLoading() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (shipmentId) => outboundOperationsApi.completeLoading(shipmentId),
    onSuccess: (_, shipmentId) => {
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.loadingShipments })
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.loadingStatus(shipmentId) })
      qc.invalidateQueries({ queryKey: OUTBOUND_QUERY_KEYS.shipments })
      toast.success('Hoàn thành xếp hàng')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Lỗi hoàn thành xếp hàng')
    },
  })
}
