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
