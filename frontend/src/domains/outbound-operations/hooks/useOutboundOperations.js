import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { outboundOperationsApi } from '../api/outboundOperations.api'

const QUERY_KEYS = {
  summary: ['outbound-operations', 'summary'],
  shipments: ['outbound-operations', 'shipments'],
  shipmentDetail: (id) => ['outbound-operations', 'shipments', id],
  shipmentHistory: (id) => ['outbound-operations', 'history', id],
  shipmentExceptions: (id) => ['outbound-operations', 'exceptions', id],
  allocations: (id) => ['outbound-operations', 'allocations', id],
  weighingHistory: (id) => ['outbound-operations', 'weighing-history', id],
  pendingApprovals: ['outbound-operations', 'pending-approvals'],
}

export function useOutboundDashboardSummary(warehouseId) {
  return useQuery({
    queryKey: [...QUERY_KEYS.summary, warehouseId],
    queryFn: () => outboundOperationsApi.getDashboardSummary(warehouseId),
    staleTime: 30000,
  })
}

export function useOutboundShipments(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.shipments, filters],
    queryFn: () => outboundOperationsApi.getShipments(filters),
    staleTime: 15000,
  })
}

export function useOutboundShipmentDetail(id) {
  return useQuery({
    queryKey: QUERY_KEYS.shipmentDetail(id),
    queryFn: () => outboundOperationsApi.getShipmentById(id),
    enabled: Boolean(id),
  })
}

export function useOutboundShipmentHistory(id) {
  return useQuery({
    queryKey: QUERY_KEYS.shipmentHistory(id),
    queryFn: () => outboundOperationsApi.getShipmentHistory(id),
    enabled: Boolean(id),
  })
}

export function useOutboundShipmentExceptions(id) {
  return useQuery({
    queryKey: QUERY_KEYS.shipmentExceptions(id),
    queryFn: () => outboundOperationsApi.getShipmentExceptions(id),
    enabled: Boolean(id),
  })
}

export function useOutboundAllocations(id) {
  return useQuery({
    queryKey: QUERY_KEYS.allocations(id),
    queryFn: () => outboundOperationsApi.getAllocations(id),
    enabled: Boolean(id),
  })
}

export function useOutboundWeighingHistory(id) {
  return useQuery({
    queryKey: QUERY_KEYS.weighingHistory(id),
    queryFn: () => outboundOperationsApi.getWeighingHistory(id),
    enabled: Boolean(id),
  })
}

export function useOutboundPendingApprovals(warehouseId) {
  return useQuery({
    queryKey: [...QUERY_KEYS.pendingApprovals, warehouseId],
    queryFn: () => outboundOperationsApi.getPendingApprovals(warehouseId),
    staleTime: 15000,
  })
}

function useInvalidateOutboundQueries(successMessage, errorMessage) {
  const queryClient = useQueryClient()

  return {
    queryClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shipments })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingApprovals })
      toast.success(successMessage)
    },
    onError: (error) => {
      toast.error(error?.error?.message || errorMessage)
    },
  }
}

export function useCreateOutboundShipment() {
  const { onSuccess, onError } = useInvalidateOutboundQueries('Đã tạo shipment', 'Không thể tạo shipment')
  return useMutation({ mutationFn: (data) => outboundOperationsApi.createShipment(data), onSuccess, onError })
}

export function useConfirmOutboundShipment() {
  const { queryClient, onError } = useInvalidateOutboundQueries('Đã confirm shipment', 'Không thể confirm shipment')
  return useMutation({
    mutationFn: (id) => outboundOperationsApi.confirmShipment(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shipments })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shipmentDetail(id) })
      toast.success('Đã confirm shipment')
    },
    onError,
  })
}

export function useCancelOutboundShipment() {
  const { onSuccess, onError } = useInvalidateOutboundQueries('Đã hủy shipment', 'Không thể hủy shipment')
  return useMutation({ mutationFn: ({ id, data }) => outboundOperationsApi.cancelShipment(id, data), onSuccess, onError })
}

export function useAllocateOutboundShipment() {
  const { queryClient, onError } = useInvalidateOutboundQueries('Đã allocate shipment', 'Không thể allocate shipment')
  return useMutation({
    mutationFn: (id) => outboundOperationsApi.allocateShipment(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shipments })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shipmentDetail(id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allocations(id) })
      toast.success('Đã allocate shipment')
    },
    onError,
  })
}

export function useUnallocateOutboundShipment() {
  const { queryClient, onError } = useInvalidateOutboundQueries('Đã release allocation', 'Không thể release allocation')
  return useMutation({
    mutationFn: (id) => outboundOperationsApi.unallocateShipment(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shipments })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shipmentDetail(id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allocations(id) })
      toast.success('Đã release allocation')
    },
    onError,
  })
}

export function useRecordOutboundTare() {
  const { queryClient, onError } = useInvalidateOutboundQueries('Đã ghi tare weight', 'Không thể ghi tare weight')
  return useMutation({
    mutationFn: ({ id, data }) => outboundOperationsApi.recordTare(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shipments })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shipmentDetail(id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.weighingHistory(id) })
      toast.success('Đã ghi tare weight')
    },
    onError,
  })
}

export function useRecordOutboundGross() {
  const { queryClient, onError } = useInvalidateOutboundQueries('Đã ghi gross weight', 'Không thể ghi gross weight')
  return useMutation({
    mutationFn: ({ id, data }) => outboundOperationsApi.recordGross(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shipments })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shipmentDetail(id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.weighingHistory(id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingApprovals })
      toast.success('Đã ghi gross weight và chạy tolerance check')
    },
    onError,
  })
}

export function useShipOutboundShipment() {
  const { onSuccess, onError } = useInvalidateOutboundQueries('Đã ship và post inventory', 'Không thể ship shipment')
  return useMutation({ mutationFn: (id) => outboundOperationsApi.shipShipment(id), onSuccess, onError })
}

export function useApproveOutboundShipment() {
  const { onSuccess, onError } = useInvalidateOutboundQueries('Đã approve shipment', 'Không thể approve shipment')
  return useMutation({ mutationFn: ({ id, data }) => outboundOperationsApi.approveShipment(id, data), onSuccess, onError })
}

export function useRejectOutboundShipment() {
  const { onSuccess, onError } = useInvalidateOutboundQueries('Đã reject shipment', 'Không thể reject shipment')
  return useMutation({ mutationFn: ({ id, data }) => outboundOperationsApi.rejectShipment(id, data), onSuccess, onError })
}

export { QUERY_KEYS as OUTBOUND_OPERATIONS_QUERY_KEYS }
