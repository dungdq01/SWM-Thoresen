import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
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
    onError: (error) => toast.error(error?.error?.message || errorMessage),
  }
}

export function useCreateVasWorkOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.workOrders, QUERY_KEYS.dashboard], 'Đã tạo VAS work order', 'Không thể tạo VAS work order')
  return useMutation({ mutationFn: (data) => vasApi.createWorkOrder(data), onSuccess, onError })
}

export function useReleaseVasWorkOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.workOrders], 'Đã release VAS work order', 'Không thể release')
  return useMutation({ mutationFn: (id) => vasApi.releaseWorkOrder(id), onSuccess, onError })
}

export function useStartVasWorkOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.workOrders], 'Đã start VAS work order', 'Không thể start')
  return useMutation({ mutationFn: (id) => vasApi.startWorkOrder(id), onSuccess, onError })
}

export function useCompleteVasWorkOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.workOrders, QUERY_KEYS.dashboard], 'Đã complete VAS work order', 'Không thể complete')
  return useMutation({ mutationFn: ({ id, data }) => vasApi.completeWorkOrder(id, data), onSuccess, onError })
}

export function useCancelVasWorkOrder() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.workOrders], 'Đã cancel VAS work order', 'Không thể cancel')
  return useMutation({ mutationFn: ({ id, data }) => vasApi.cancelWorkOrder(id, data), onSuccess, onError })
}

export function useStartVasSession() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.sessions], 'Đã start session', 'Không thể start session')
  return useMutation({ mutationFn: (data) => vasApi.startSession(data), onSuccess, onError })
}

export function useEndVasSession() {
  const { onSuccess, onError } = useInvalidateQueries([QUERY_KEYS.sessions, QUERY_KEYS.workOrders], 'Đã end session', 'Không thể end session')
  return useMutation({ mutationFn: (id) => vasApi.endSession(id), onSuccess, onError })
}

export function useRecordBag() {
  const { queryClient, onError } = useInvalidateQueries([], 'Đã ghi nhận bag', 'Không thể ghi nhận bag')
  return useMutation({
    mutationFn: ({ sessionId, data }) => vasApi.recordBag(sessionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessions })
      toast.success('Đã ghi nhận bag')
    },
    onError,
  })
}

export { QUERY_KEYS as VAS_QUERY_KEYS }
