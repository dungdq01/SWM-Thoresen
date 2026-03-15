import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'
import { vasApi } from '../api/vas.api'

const QUERY_KEYS = {
  workOrders: ['vas', 'work-orders'],
  workOrderDetail: (id) => ['vas', 'work-orders', id],
  sessions: ['vas', 'sessions'],
  dashboard: ['vas', 'dashboard'],
}

export function useVasWorkOrders(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.workOrders, filters],
    queryFn: () => vasApi.getWorkOrders(filters),
    staleTime: 15000,
  })
}

export function useVasWorkOrderDetail(id) {
  return useQuery({
    queryKey: QUERY_KEYS.workOrderDetail(id),
    queryFn: () => vasApi.getWorkOrderById(id),
    enabled: Boolean(id),
  })
}

export function useVasSessions(filters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.sessions, filters],
    queryFn: () => vasApi.getSessions(filters),
    staleTime: 15000,
  })
}

export function useVasDashboard(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.dashboard, params],
    queryFn: () => vasApi.getDashboard(params),
    staleTime: 30000,
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
    onError: (error) => toast.error(parseApiError(error)),
  }
}

export function useCreateVasWorkOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.workOrders, QUERY_KEYS.dashboard], 'Đã tạo VAS work order', 'Không thể tạo VAS work order')
  return useMutation({ mutationFn: (data) => vasApi.createWorkOrder(data), onSuccess, onError })
}

export function useConfirmVasWorkOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.workOrders], 'Đã confirm VAS work order', 'Không thể confirm')
  return useMutation({ mutationFn: (id) => vasApi.confirmWorkOrder(id), onSuccess, onError })
}

export function useCompleteVasWorkOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.workOrders, QUERY_KEYS.dashboard], 'Đã complete VAS work order', 'Không thể complete')
  return useMutation({ mutationFn: ({ id, data }) => vasApi.completeWorkOrder(id, data), onSuccess, onError })
}

export function useCancelVasWorkOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.workOrders], 'Đã cancel VAS work order', 'Không thể cancel')
  return useMutation({ mutationFn: ({ id, data }) => vasApi.cancelWorkOrder(id, data), onSuccess, onError })
}

export function useAddVasSession() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.sessions, QUERY_KEYS.workOrders], 'Đã thêm session', 'Không thể thêm session')
  return useMutation({ mutationFn: ({ woId, data }) => vasApi.addSession(woId, data), onSuccess, onError })
}

export { QUERY_KEYS as VAS_QUERY_KEYS }
