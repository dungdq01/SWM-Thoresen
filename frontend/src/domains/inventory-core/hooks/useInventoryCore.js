import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { inventoryCoreApi } from '../api/inventoryCore.api'

const QUERY_KEYS = {
  onHand: ['inventory-core', 'on-hand'],
  availability: ['inventory-core', 'availability'],
  transactions: ['inventory-core', 'transactions'],
  transactionDetail: (transId) => ['inventory-core', 'transactions', transId],
  holds: ['inventory-core', 'holds'],
  reconciliationRuns: ['inventory-core', 'reconciliation-runs'],
  reconciliationRun: (runId) => ['inventory-core', 'reconciliation-runs', runId],
  snapshotRuns: ['inventory-core', 'snapshot-runs'],
  snapshotRun: (runId) => ['inventory-core', 'snapshot-runs', runId],
  snapshotBilling: ['inventory-core', 'snapshot-billing'],
  snapshotBillingAggregate: ['inventory-core', 'snapshot-billing-aggregate'],
}

export function useOnHandList(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.onHand, filters],
    queryFn: () => inventoryCoreApi.getOnHand(filters),
    staleTime: 30000,
    select: (response) => {
      // Handle both unwrapped array and wrapped { data, pagination } format
      if (Array.isArray(response)) {
        return { data: response, pagination: { page: 1, totalPages: 1, total: response.length } }
      }
      return {
        data: response?.data ?? response ?? [],
        pagination: response?.pagination ?? { page: 1, totalPages: 1, total: 0 },
      }
    },
  })
}

export function useAvailabilityCheck(params = {}, enabled = false) {
  return useQuery({
    queryKey: [...QUERY_KEYS.availability, params],
    queryFn: () => inventoryCoreApi.getAvailability(params),
    enabled,
    staleTime: 15000,
  })
}

export function useTransactionList(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.transactions, filters],
    queryFn: () => inventoryCoreApi.getTransactions(filters),
    staleTime: 30000,
    select: (response) => {
      if (Array.isArray(response)) {
        return { data: response, pagination: { page: 1, totalPages: 1, total: response.length } }
      }
      return {
        data: response?.data ?? [],
        pagination: response?.pagination ?? { page: 1, totalPages: 1, total: 0 },
      }
    },
  })
}

export function useTransactionDetail(transId) {
  return useQuery({
    queryKey: QUERY_KEYS.transactionDetail(transId),
    queryFn: () => inventoryCoreApi.getTransactionById(transId),
    enabled: !!transId,
  })
}

export function useHoldList(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.holds, filters],
    queryFn: () => inventoryCoreApi.getHolds(filters),
    staleTime: 30000,
    select: (response) => {
      if (Array.isArray(response)) {
        return { data: response, pagination: { page: 1, totalPages: 1, total: response.length } }
      }
      return {
        data: response?.data ?? [],
        pagination: response?.pagination ?? { page: 1, totalPages: 1, total: 0 },
      }
    },
  })
}

export function useCreatePosting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => inventoryCoreApi.createPosting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onHand })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions })
      toast.success('Đã post inventory transaction')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể post transaction')
    },
  })
}

export function useReversePosting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => inventoryCoreApi.reversePosting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onHand })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions })
      toast.success('Đã reverse transaction')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể reverse transaction')
    },
  })
}

const HOLD_ERROR_MESSAGES = {
  INV_INSUFFICIENT_STOCK: 'Mặt hàng không đủ tồn kho khả dụng để giữ. Vui lòng kiểm tra lại số lượng hoặc chọn mặt hàng khác.',
  INV_STATUS_NOT_ALLOCATABLE: 'Trạng thái tồn kho không cho phép giữ hàng.',
  INV_HOLD_NOT_FOUND: 'Không tìm thấy bản ghi giữ hàng.',
  INV_HOLD_INSUFFICIENT_QTY: 'Số lượng giải phóng vượt quá số lượng đang giữ.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.',
}

function getHoldErrorMessage(error, fallback) {
  return HOLD_ERROR_MESSAGES[error?.error] || error?.message || fallback
}

export function useCreateHold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => inventoryCoreApi.createHold(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onHand })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holds })
      toast.success('Đã tạo giữ hàng thành công')
    },
    onError: (error) => {
      toast.error(getHoldErrorMessage(error, 'Không thể tạo giữ hàng'))
    },
  })
}

export function useReleaseHold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ holdId, data }) => inventoryCoreApi.releaseHold(holdId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onHand })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holds })
      toast.success('Đã giải phóng giữ hàng thành công')
    },
    onError: (error) => {
      toast.error(getHoldErrorMessage(error, 'Không thể giải phóng giữ hàng'))
    },
  })
}

export function useCancelHold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ holdId, data }) => inventoryCoreApi.cancelHold(holdId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onHand })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.holds })
      toast.success('Đã hủy giữ hàng thành công')
    },
    onError: (error) => {
      toast.error(getHoldErrorMessage(error, 'Không thể hủy giữ hàng'))
    },
  })
}

// ========== Reconciliation Hooks ==========

export function useReconciliationRuns(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.reconciliationRuns, filters],
    queryFn: () => inventoryCoreApi.getReconciliationRuns(filters),
    staleTime: 30000,
    select: (response) => {
      if (Array.isArray(response)) {
        return { data: response, pagination: { page: 1, totalPages: 1, total: response.length } }
      }
      return {
        data: response?.data ?? [],
        pagination: response?.pagination ?? { page: 1, totalPages: 1, total: 0 },
      }
    },
  })
}

export function useReconciliationRunDetail(runId) {
  return useQuery({
    queryKey: QUERY_KEYS.reconciliationRun(runId),
    queryFn: () => inventoryCoreApi.getReconciliationRun(runId),
    enabled: !!runId,
    select: (response) => response?.data ?? response,
  })
}

export function useCreateReconciliationRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => inventoryCoreApi.createReconciliationRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reconciliationRuns })
      toast.success('Đã tạo phiên đối soát tồn kho')
    },
    onError: (error) => {
      toast.error(error?.message || 'Không thể tạo phiên đối soát')
    },
  })
}

export function useReviewReconciliationResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ resultId, data }) => inventoryCoreApi.reviewReconciliationResult(resultId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reconciliationRuns })
      toast.success('Đã đánh dấu kết quả là đã xem xét')
    },
    onError: (error) => {
      toast.error(error?.message || 'Không thể cập nhật trạng thái')
    },
  })
}

export function useResolveReconciliationResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ resultId, data }) => inventoryCoreApi.resolveReconciliationResult(resultId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reconciliationRuns })
      toast.success('Đã xử lý xong chênh lệch')
    },
    onError: (error) => {
      toast.error(error?.message || 'Không thể cập nhật trạng thái')
    },
  })
}

// ========== Snapshot Hooks ==========

export function useSnapshotRuns(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.snapshotRuns, filters],
    queryFn: () => inventoryCoreApi.getSnapshotRuns(filters),
    staleTime: 30000,
    select: (response) => {
      if (Array.isArray(response)) {
        return { data: response, pagination: { page: 1, totalPages: 1, total: response.length } }
      }
      return {
        data: response?.data ?? [],
        pagination: response?.pagination ?? { page: 1, totalPages: 1, total: 0 },
      }
    },
  })
}

export function useSnapshotRunDetail(runId) {
  return useQuery({
    queryKey: QUERY_KEYS.snapshotRun(runId),
    queryFn: () => inventoryCoreApi.getSnapshotRun(runId),
    enabled: !!runId,
    select: (response) => response?.data ?? response,
  })
}

export function useCreateSnapshotRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => inventoryCoreApi.createSnapshotRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.snapshotRuns })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.snapshotBilling })
      toast.success('Đã tạo phiên chụp tồn kho')
    },
    onError: (error) => {
      toast.error(error?.message || 'Không thể tạo phiên chụp tồn kho')
    },
  })
}

export function useSnapshotBilling(filters = {}, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.snapshotBilling, filters],
    queryFn: () => inventoryCoreApi.getSnapshotsBilling(filters),
    enabled,
    staleTime: 60000,
    select: (response) => {
      if (Array.isArray(response)) {
        return { data: response, pagination: { page: 1, totalPages: 1, total: response.length } }
      }
      return {
        data: response?.data ?? [],
        pagination: response?.pagination ?? { page: 1, totalPages: 1, total: 0 },
      }
    },
  })
}

export function useSnapshotBillingAggregate(filters = {}, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.snapshotBillingAggregate, filters],
    queryFn: () => inventoryCoreApi.getSnapshotsBillingAggregate(filters),
    enabled,
    staleTime: 60000,
    select: (response) => response?.data ?? [],
  })
}

export { QUERY_KEYS as INVENTORY_CORE_QUERY_KEYS }
