import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'
import { inboundOperationsApi } from '../api/inboundOperations.api'

const QUERY_KEYS = {
  summary: ['inbound-operations', 'summary'],
  receipts: ['inbound-operations', 'receipts'],
  receiptDetail: (id) => ['inbound-operations', 'receipts', id],
  receiptHistory: (id) => ['inbound-operations', 'history', id],
  weighLogs: (id) => ['inbound-operations', 'weigh-logs', id],
  exceptions: ['inbound-operations', 'exceptions'],
  putawayQueue: ['inbound-operations', 'putaway-queue'],
  purchaseOrders: ['inbound-operations', 'purchase-orders'],
  purchaseOrderDetail: (id) => ['inbound-operations', 'purchase-orders', id],
}

export function useInboundDashboardSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.summary,
    queryFn: () => inboundOperationsApi.getDashboardSummary(),
    staleTime: 30000,
  })
}

export function useInboundReceipts(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.receipts, filters],
    queryFn: () => inboundOperationsApi.getReceipts(filters),
    staleTime: 15000,
  })
}

export function useInboundReceiptDetail(id) {
  return useQuery({
    queryKey: QUERY_KEYS.receiptDetail(id),
    queryFn: () => inboundOperationsApi.getReceiptById(id),
    enabled: Boolean(id),
  })
}

export function useInboundReceiptHistory(id) {
  return useQuery({
    queryKey: QUERY_KEYS.receiptHistory(id),
    queryFn: () => inboundOperationsApi.getReceiptHistory(id),
    enabled: Boolean(id),
  })
}

export function useInboundWeighLogs(id) {
  return useQuery({
    queryKey: QUERY_KEYS.weighLogs(id),
    queryFn: () => inboundOperationsApi.getWeighLogs(id),
    enabled: Boolean(id),
  })
}

export function useInboundExceptions(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.exceptions, filters],
    queryFn: () => inboundOperationsApi.getExceptions(filters),
    staleTime: 15000,
  })
}

export function useInboundPutawayQueue(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.putawayQueue, filters],
    queryFn: () => inboundOperationsApi.getPutawayQueue(filters),
    staleTime: 15000,
  })
}

function useInvalidateInboundQueries(successMessage, errorMessage) {
  const queryClient = useQueryClient()

  return {
    queryClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.receipts })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.exceptions })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.putawayQueue })
      toast.success(successMessage)
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  }
}

export function useCreateInboundReceipt() {
  const { onSuccess, onError } = useInvalidateInboundQueries('Đã tạo phiếu nhập', 'Không thể tạo phiếu nhập')
  return useMutation({ mutationFn: (data) => inboundOperationsApi.createReceipt(data), onSuccess, onError })
}

export function useUpdateInboundReceipt() {
  const { queryClient, onError } = useInvalidateInboundQueries('Đã cập nhật phiếu nhập', 'Không thể cập nhật phiếu nhập')
  return useMutation({
    mutationFn: ({ id, data }) => inboundOperationsApi.updateReceipt(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.receipts })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.receiptDetail(id) })
      toast.success('Đã cập nhật phiếu nhập')
    },
    onError,
  })
}

export function useDeleteInboundReceipt() {
  const { onSuccess, onError } = useInvalidateInboundQueries('Đã xóa phiếu nhập', 'Không thể xóa phiếu nhập')
  return useMutation({ mutationFn: (id) => inboundOperationsApi.deleteReceipt(id), onSuccess, onError })
}

export function useConfirmInboundReceipt() {
  const { queryClient, onError } = useInvalidateInboundQueries('Đã confirm receipt', 'Không thể confirm receipt')
  return useMutation({
    mutationFn: (id) => inboundOperationsApi.confirmReceipt(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.receipts })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.receiptDetail(id) })
      toast.success('Đã confirm receipt')
    },
    onError,
  })
}

export function useStartInboundProcessing() {
  const { onSuccess, onError } = useInvalidateInboundQueries('Đã chuyển receipt sang processing', 'Không thể start processing')
  return useMutation({ mutationFn: (id) => inboundOperationsApi.startProcessing(id), onSuccess, onError })
}

export function useRecordInboundWeighIn() {
  const { onSuccess, onError } = useInvalidateInboundQueries('Đã ghi weigh-in', 'Không thể ghi weigh-in')
  return useMutation({ mutationFn: (data) => inboundOperationsApi.recordWeighIn(data), onSuccess, onError })
}

export function useRecordInboundWeighOut() {
  const { onSuccess, onError } = useInvalidateInboundQueries('Đã ghi weigh-out và chạy tolerance', 'Không thể ghi weigh-out')
  return useMutation({ mutationFn: (data) => inboundOperationsApi.recordWeighOut(data), onSuccess, onError })
}

export function useApplyInboundManualWeight() {
  const { onSuccess, onError } = useInvalidateInboundQueries('Đã áp dụng manual weight', 'Không thể áp dụng manual weight')
  return useMutation({ mutationFn: ({ id, data }) => inboundOperationsApi.applyManualWeight(id, data), onSuccess, onError })
}

export function useReweighInboundReceipt() {
  const { onSuccess, onError } = useInvalidateInboundQueries('Đã tạo lại lượt cân', 'Không thể re-weigh receipt')
  return useMutation({ mutationFn: (id) => inboundOperationsApi.reweighReceipt(id), onSuccess, onError })
}

export function useCancelInboundReceipt() {
  const { onSuccess, onError } = useInvalidateInboundQueries('Đã hủy receipt', 'Không thể hủy receipt')
  return useMutation({ mutationFn: ({ id, data }) => inboundOperationsApi.cancelReceipt(id, data), onSuccess, onError })
}

export function useCompleteInboundPutaway() {
  const { onSuccess, onError } = useInvalidateInboundQueries('Đã hoàn thành cất hàng', 'Không thể hoàn thành cất hàng')
  return useMutation({ mutationFn: ({ id, data }) => inboundOperationsApi.completePutaway(id, data), onSuccess, onError })
}

export function useCloseInboundReceipt() {
  const { onSuccess, onError } = useInvalidateInboundQueries('Đã đóng phiếu', 'Không thể đóng phiếu')
  return useMutation({ mutationFn: (id) => inboundOperationsApi.closeReceipt(id), onSuccess, onError })
}

// ── Purchase Order hooks ──
export function usePurchaseOrders(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.purchaseOrders, filters],
    queryFn: () => inboundOperationsApi.getPurchaseOrders(filters),
    staleTime: 15000,
  })
}

export function usePurchaseOrderDetail(id) {
  return useQuery({
    queryKey: QUERY_KEYS.purchaseOrderDetail(id),
    queryFn: () => inboundOperationsApi.getPurchaseOrderById(id),
    enabled: Boolean(id),
  })
}

function useInvalidatePOQueries(successMessage, errorMessage) {
  const queryClient = useQueryClient()
  return {
    queryClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchaseOrders })
      toast.success(successMessage)
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  }
}

export function useNextPoNumber(enabled = false) {
  return useQuery({
    queryKey: [...QUERY_KEYS.purchaseOrders, 'next-number'],
    queryFn: () => inboundOperationsApi.getNextPoNumber(),
    enabled,
    staleTime: 0,
  })
}

export function useCreatePurchaseOrder() {
  const { onSuccess, onError } = useInvalidatePOQueries('Đã tạo Purchase Order', 'Không thể tạo Purchase Order')
  return useMutation({ mutationFn: (data) => inboundOperationsApi.createPurchaseOrder(data), onSuccess, onError })
}

export function useUpdatePurchaseOrder() {
  const { queryClient, onError } = useInvalidatePOQueries('Đã cập nhật Purchase Order', 'Không thể cập nhật Purchase Order')
  return useMutation({
    mutationFn: ({ id, data }) => inboundOperationsApi.updatePurchaseOrder(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchaseOrders })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchaseOrderDetail(id) })
      toast.success('Đã cập nhật Purchase Order')
    },
    onError,
  })
}

export function useConfirmPurchaseOrder() {
  const { onSuccess, onError } = useInvalidatePOQueries('Đã xác nhận Purchase Order', 'Không thể xác nhận Purchase Order')
  return useMutation({ mutationFn: (id) => inboundOperationsApi.confirmPurchaseOrder(id), onSuccess, onError })
}

export function useUnconfirmPurchaseOrder() {
  const { onSuccess, onError } = useInvalidatePOQueries('Đã hủy xác nhận Purchase Order', 'Không thể hủy xác nhận Purchase Order')
  return useMutation({ mutationFn: (id) => inboundOperationsApi.unconfirmPurchaseOrder(id), onSuccess, onError })
}

export function useClosePurchaseOrder() {
  const { onSuccess, onError } = useInvalidatePOQueries('Đã đóng Purchase Order', 'Không thể đóng Purchase Order')
  return useMutation({ mutationFn: (id) => inboundOperationsApi.closePurchaseOrder(id), onSuccess, onError })
}

export function useCancelPurchaseOrder() {
  const { onSuccess, onError } = useInvalidatePOQueries('Đã hủy Purchase Order', 'Không thể hủy Purchase Order')
  return useMutation({ mutationFn: (id) => inboundOperationsApi.cancelPurchaseOrder(id), onSuccess, onError })
}

// ── Inbound Documents hooks ──
export function useInboundDocuments(filters = {}) {
  return useQuery({
    queryKey: ['inbound-documents', filters],
    queryFn: () => inboundOperationsApi.getDocuments(filters),
    staleTime: 15000,
  })
}

export function useUploadInboundDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData) => inboundOperationsApi.uploadDocument(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-documents'] })
      toast.success('Đã tải lên chứng từ')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể tải lên chứng từ')
    },
  })
}

export function useDeleteInboundDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => inboundOperationsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-documents'] })
      toast.success('Đã xóa chứng từ')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể xóa chứng từ')
    },
  })
}

export function useConfirmInboundDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => inboundOperationsApi.confirmDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-documents'] })
      toast.success('Đã xác nhận chứng từ')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể xác nhận chứng từ')
    },
  })
}

export function useReportErrorInboundDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }) => inboundOperationsApi.reportErrorDocument(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-documents'] })
      toast.success('Đã báo lỗi chứng từ')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể báo lỗi chứng từ')
    },
  })
}

export function useInboundDocumentDetail(id) {
  return useQuery({
    queryKey: ['inbound-documents', id],
    queryFn: () => inboundOperationsApi.getDocumentById(id),
    enabled: Boolean(id),
  })
}

export { QUERY_KEYS as INBOUND_OPERATIONS_QUERY_KEYS }
