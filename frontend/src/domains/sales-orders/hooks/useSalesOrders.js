import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'
import { salesOrdersApi } from '../api/salesOrders.api'

const QUERY_KEYS = {
  summary: ['sales-orders', 'summary'],
  list: ['sales-orders', 'list'],
  detail: (id) => ['sales-orders', 'detail', id],
  fulfillment: (id) => ['sales-orders', 'fulfillment', id],
  shipments: (id) => ['sales-orders', 'shipments', id],
  history: (id) => ['sales-orders', 'history', id],
}

// ── Queries ──

export function useNextSoNumber(enabled = false) {
  return useQuery({
    queryKey: [...QUERY_KEYS.list, 'next-number'],
    queryFn: () => salesOrdersApi.getNextSoNumber(),
    enabled,
    staleTime: 0,
  })
}

export function useSalesOrderDashboard(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.summary, params],
    queryFn: () => salesOrdersApi.getDashboardSummary(params),
    staleTime: 30000,
  })
}

export function useSalesOrders(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.list, filters],
    queryFn: () => salesOrdersApi.getList(filters),
    staleTime: 15000,
  })
}

export function useSalesOrderDetail(id) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(id),
    queryFn: () => salesOrdersApi.getById(id),
    enabled: Boolean(id),
  })
}

export function useSalesOrderFulfillment(id) {
  return useQuery({
    queryKey: QUERY_KEYS.fulfillment(id),
    queryFn: () => salesOrdersApi.getFulfillment(id),
    enabled: Boolean(id),
  })
}

export function useSalesOrderShipments(id) {
  return useQuery({
    queryKey: QUERY_KEYS.shipments(id),
    queryFn: () => salesOrdersApi.getShipments(id),
    enabled: Boolean(id),
  })
}

export function useSalesOrderHistory(id) {
  return useQuery({
    queryKey: QUERY_KEYS.history(id),
    queryFn: () => salesOrdersApi.getHistory(id),
    enabled: Boolean(id),
  })
}

// ── Mutations ──

function useInvalidateSOQueries(successMessage, errorMessage) {
  const queryClient = useQueryClient()
  return {
    queryClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list })
      toast.success(successMessage)
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  }
}

export function useCreateSalesOrder() {
  const { onSuccess, onError } = useInvalidateSOQueries('Đã tạo đơn bán hàng', 'Không thể tạo đơn bán hàng')
  return useMutation({ mutationFn: (data) => salesOrdersApi.create(data), onSuccess, onError })
}

export function useUpdateSalesOrder() {
  const { queryClient, onError } = useInvalidateSOQueries('Đã cập nhật đơn bán hàng', 'Không thể cập nhật')
  return useMutation({
    mutationFn: ({ id, data }) => salesOrdersApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(id) })
      toast.success('Đã cập nhật đơn bán hàng')
    },
    onError,
  })
}

export function useConfirmSalesOrder() {
  const { queryClient, onError } = useInvalidateSOQueries('Đã xác nhận đơn bán hàng', 'Không thể xác nhận')
  return useMutation({
    mutationFn: (id) => salesOrdersApi.confirm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(id) })
      toast.success('Đã xác nhận đơn bán hàng')
    },
    onError,
  })
}

export function useCancelSalesOrder() {
  const { queryClient, onError } = useInvalidateSOQueries('Đã hủy đơn bán hàng', 'Không thể hủy')
  return useMutation({
    mutationFn: ({ id, data }) => salesOrdersApi.cancel(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(id) })
      toast.success('Đã hủy đơn bán hàng')
    },
    onError,
  })
}

export function useCloseSalesOrder() {
  const { queryClient, onError } = useInvalidateSOQueries('Đã đóng đơn bán hàng', 'Không thể đóng')
  return useMutation({
    mutationFn: ({ id, data }) => salesOrdersApi.close(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(id) })
      toast.success('Đã đóng đơn bán hàng')
    },
    onError,
  })
}

export function useReleaseShipment() {
  const { queryClient, onError } = useInvalidateSOQueries('Đã tạo shipment từ SO', 'Không thể tạo shipment')
  return useMutation({
    mutationFn: ({ id, data }) => salesOrdersApi.releaseShipment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fulfillment(id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shipments(id) })
      toast.success('Đã tạo shipment từ đơn bán hàng')
    },
    onError,
  })
}

export { QUERY_KEYS as SALES_ORDER_QUERY_KEYS }
