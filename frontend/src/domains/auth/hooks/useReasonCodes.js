import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@shared/api/queryClient'
import { authApi } from '../api/auth.api'
import toast from 'react-hot-toast'

export function useReasonCodes(filters = {}) {
  return useQuery({
    queryKey: queryKeys.reasonCodes.list(filters),
    queryFn: () => authApi.getReasonCodes(filters),
    select: (response) => response.data || [],
  })
}

export function useCreateReasonCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => authApi.createReasonCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reasonCodes.all })
      toast.success('Tạo mã lý do mới thành công')
    },
    onError: (error) => {
      toast.error(error.error?.message || 'Không thể tạo mã lý do')
    },
  })
}

export function useUpdateReasonCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => authApi.updateReasonCode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reasonCodes.all })
      toast.success('Cập nhật mã lý do thành công')
    },
    onError: (error) => {
      toast.error(error.error?.message || 'Không thể cập nhật mã lý do')
    },
  })
}

export function useDeactivateReasonCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => authApi.deactivateReasonCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reasonCodes.all })
      toast.success('Đã vô hiệu hóa mã lý do')
    },
    onError: (error) => {
      toast.error(error.error?.message || 'Không thể vô hiệu hóa mã lý do')
    },
  })
}
