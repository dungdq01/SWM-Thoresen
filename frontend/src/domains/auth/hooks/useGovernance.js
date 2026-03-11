import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@shared/api/queryClient'
import { authApi } from '../api/auth.api'
import toast from 'react-hot-toast'

export function useRules(filters = {}) {
  return useQuery({
    queryKey: queryKeys.governance.rules.list(filters),
    queryFn: () => authApi.getRules(filters),
    select: (response) => response?.data ?? response ?? [],
  })
}

export function useCreateRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => authApi.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.governance.rules.all })
      toast.success('Tạo business rule mới thành công')
    },
    onError: (error) => {
      toast.error(error.error?.message || 'Không thể tạo rule')
    },
  })
}

export function useUpdateRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => authApi.updateRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.governance.rules.all })
      toast.success('Cập nhật rule thành công')
    },
    onError: (error) => {
      toast.error(error.error?.message || 'Không thể cập nhật rule')
    },
  })
}

export function useDecisionLogs(filters = {}) {
  return useQuery({
    queryKey: queryKeys.governance.decisionLogs.list(filters),
    queryFn: () => authApi.getDecisionLogs(filters),
    select: (response) => response?.data ?? response ?? [],
  })
}

export function useCreateDecisionLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => authApi.createDecisionLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.governance.decisionLogs.all })
      toast.success('Ghi nhận decision log thành công')
    },
    onError: (error) => {
      toast.error(error.error?.message || 'Không thể ghi decision log')
    },
  })
}
