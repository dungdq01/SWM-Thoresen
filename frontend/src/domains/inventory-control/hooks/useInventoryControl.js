import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { inventoryControlApi } from '../api/inventoryControl.api'

const QUERY_KEYS = {
  onHand: ['inventory-control', 'on-hand'],
  movementHistory: ['inventory-control', 'movement-history'],
  moveOrders: ['inventory-control', 'move-orders'],
  moveOrderDetail: (id) => ['inventory-control', 'move-orders', id],
  transferOrders: ['inventory-control', 'transfer-orders'],
  transferOrderDetail: (id) => ['inventory-control', 'transfer-orders', id],
  statusChanges: ['inventory-control', 'status-changes'],
  cycleCounts: ['inventory-control', 'cycle-counts'],
  cycleCountDetail: (id) => ['inventory-control', 'cycle-counts', id],
  adjustments: ['inventory-control', 'adjustments'],
}

export function useOnHand(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.onHand, filters],
    queryFn: () => inventoryControlApi.getOnHand(filters),
    staleTime: 30000,
  })
}

export function useOnHandByItem(itemId, params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.onHand, 'item', itemId, params],
    queryFn: () => inventoryControlApi.getOnHandByItem(itemId, params),
    enabled: Boolean(itemId),
  })
}

export function useMovementHistory(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.movementHistory, filters],
    queryFn: () => inventoryControlApi.getMovementHistory(filters),
    staleTime: 15000,
  })
}

export function useMoveOrders(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.moveOrders, filters],
    queryFn: () => inventoryControlApi.getMoveOrders(filters),
    staleTime: 15000,
  })
}

export function useMoveOrderDetail(id) {
  return useQuery({
    queryKey: QUERY_KEYS.moveOrderDetail(id),
    queryFn: () => inventoryControlApi.getMoveOrderById(id),
    enabled: Boolean(id),
  })
}

export function useTransferOrders(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.transferOrders, filters],
    queryFn: () => inventoryControlApi.getTransferOrders(filters),
    staleTime: 15000,
  })
}

export function useTransferOrderDetail(id) {
  return useQuery({
    queryKey: QUERY_KEYS.transferOrderDetail(id),
    queryFn: () => inventoryControlApi.getTransferOrderById(id),
    enabled: Boolean(id),
  })
}

export function useStatusChanges(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.statusChanges, filters],
    queryFn: () => inventoryControlApi.getStatusChanges(filters),
    staleTime: 15000,
  })
}

export function useCycleCounts(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.cycleCounts, filters],
    queryFn: () => inventoryControlApi.getCycleCounts(filters),
    staleTime: 15000,
  })
}

export function useCycleCountDetail(id) {
  return useQuery({
    queryKey: QUERY_KEYS.cycleCountDetail(id),
    queryFn: () => inventoryControlApi.getCycleCountById(id),
    enabled: Boolean(id),
  })
}

export function useAdjustments(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.adjustments, filters],
    queryFn: () => inventoryControlApi.getAdjustments(filters),
    staleTime: 15000,
  })
}

function useInvalidateQueries(keys, successMessage, errorMessage) {
  const queryClient = useQueryClient()
  return {
    queryClient,
    onSuccess: () => {
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
      toast.success(successMessage)
    },
    onError: (error) => toast.error(error?.error?.message || errorMessage),
  }
}

export function useCreateMoveOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.moveOrders], 'Đã tạo move order', 'Không thể tạo move order')
  return useMutation({ mutationFn: (data) => inventoryControlApi.createMoveOrder(data), onSuccess, onError })
}

export function useConfirmMoveOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.moveOrders], 'Đã confirm move order', 'Không thể confirm')
  return useMutation({ mutationFn: (id) => inventoryControlApi.confirmMoveOrder(id), onSuccess, onError })
}

export function useExecuteMoveOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.moveOrders, QUERY_KEYS.onHand], 'Đã execute move order', 'Không thể execute')
  return useMutation({ mutationFn: (id) => inventoryControlApi.executeMoveOrder(id), onSuccess, onError })
}

export function useCancelMoveOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.moveOrders], 'Đã hủy move order', 'Không thể hủy')
  return useMutation({ mutationFn: ({ id, data }) => inventoryControlApi.cancelMoveOrder(id, data), onSuccess, onError })
}

export function useCreateTransferOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.transferOrders], 'Đã tạo transfer order', 'Không thể tạo transfer order')
  return useMutation({ mutationFn: (data) => inventoryControlApi.createTransferOrder(data), onSuccess, onError })
}

export function useReleaseTransferOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.transferOrders], 'Đã release transfer order', 'Không thể release')
  return useMutation({ mutationFn: (id) => inventoryControlApi.releaseTransferOrder(id), onSuccess, onError })
}

export function useShipTransferOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.transferOrders, QUERY_KEYS.onHand], 'Đã ship transfer order', 'Không thể ship')
  return useMutation({ mutationFn: ({ id, data }) => inventoryControlApi.shipTransferOrder(id, data), onSuccess, onError })
}

export function useReceiveTransferOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.transferOrders, QUERY_KEYS.onHand], 'Đã receive transfer order', 'Không thể receive')
  return useMutation({ mutationFn: ({ id, data }) => inventoryControlApi.receiveTransferOrder(id, data), onSuccess, onError })
}

export function useCloseTransferOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.transferOrders], 'Đã close transfer order', 'Không thể close')
  return useMutation({ mutationFn: ({ id, data }) => inventoryControlApi.closeTransferOrder(id, data), onSuccess, onError })
}

export function useCancelTransferOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.transferOrders], 'Đã hủy transfer order', 'Không thể hủy')
  return useMutation({ mutationFn: ({ id, data }) => inventoryControlApi.cancelTransferOrder(id, data), onSuccess, onError })
}

export function useCreateStatusChange() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.statusChanges, QUERY_KEYS.onHand], 'Đã tạo status change', 'Không thể tạo status change')
  return useMutation({ mutationFn: (data) => inventoryControlApi.createStatusChange(data), onSuccess, onError })
}

export function useCreateCycleCount() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.cycleCounts], 'Đã tạo cycle count', 'Không thể tạo cycle count')
  return useMutation({ mutationFn: (data) => inventoryControlApi.createCycleCount(data), onSuccess, onError })
}

export function useReleaseCycleCount() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.cycleCounts], 'Đã release cycle count', 'Không thể release')
  return useMutation({ mutationFn: (id) => inventoryControlApi.releaseCycleCount(id), onSuccess, onError })
}

export function useSubmitCycleCount() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.cycleCounts], 'Đã submit cycle count', 'Không thể submit')
  return useMutation({ mutationFn: ({ id, data }) => inventoryControlApi.submitCycleCount(id, data), onSuccess, onError })
}

export function useApproveCycleCount() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.cycleCounts], 'Đã approve cycle count', 'Không thể approve')
  return useMutation({ mutationFn: (id) => inventoryControlApi.approveCycleCount(id), onSuccess, onError })
}

export function usePostCycleCount() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.cycleCounts, QUERY_KEYS.onHand, QUERY_KEYS.adjustments], 'Đã post cycle count', 'Không thể post')
  return useMutation({ mutationFn: (id) => inventoryControlApi.postCycleCount(id), onSuccess, onError })
}

export function useCreateAdjustment() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.adjustments], 'Đã tạo adjustment', 'Không thể tạo adjustment')
  return useMutation({ mutationFn: (data) => inventoryControlApi.createAdjustment(data), onSuccess, onError })
}

export function useSubmitAdjustment() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.adjustments], 'Đã submit adjustment', 'Không thể submit')
  return useMutation({ mutationFn: (id) => inventoryControlApi.submitAdjustment(id), onSuccess, onError })
}

export function useApproveAdjustment() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.adjustments], 'Đã approve adjustment', 'Không thể approve')
  return useMutation({ mutationFn: (id) => inventoryControlApi.approveAdjustment(id), onSuccess, onError })
}

export function usePostAdjustment() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.adjustments, QUERY_KEYS.onHand], 'Đã post adjustment', 'Không thể post')
  return useMutation({ mutationFn: (id) => inventoryControlApi.postAdjustment(id), onSuccess, onError })
}

export { QUERY_KEYS as INVENTORY_CONTROL_QUERY_KEYS }
