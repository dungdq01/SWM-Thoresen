import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@shared/api/queryClient'
import { authApi } from '../api/auth.api'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useAuditLogs(filters = {}) {
  return useQuery({
    queryKey: queryKeys.logs.audit.list(filters),
    queryFn: () => authApi.getAuditLogs(filters),
    select: (response) => ({
      data: response?.data ?? (Array.isArray(response) ? response : []),
      meta: response?.meta ?? {},
    }),
  })
}

export function useExceptionLogs(filters = {}) {
  return useQuery({
    queryKey: queryKeys.logs.exception.list(filters),
    queryFn: () => authApi.getExceptionLogs(filters),
    select: (response) => ({
      data: response?.data ?? (Array.isArray(response) ? response : []),
      meta: response?.meta ?? {},
    }),
  })
}

export function useResolveExceptionLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => authApi.resolveExceptionLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.exception.all })
      toast.success('Đã đánh dấu exception đã xử lý')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}
