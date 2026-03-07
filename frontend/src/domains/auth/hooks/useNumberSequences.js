import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@shared/api/queryClient'
import { authApi } from '../api/auth.api'
import toast from 'react-hot-toast'

export function useNumberSequences(filters = {}) {
  return useQuery({
    queryKey: queryKeys.numberSequences.list(filters),
    queryFn: () => authApi.getNumberSequences(filters),
    select: (response) => response.data || [],
  })
}

export function useCreateNumberSequence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => authApi.createNumberSequence(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.numberSequences.all })
      toast.success('Tạo cấu hình sequence mới thành công')
    },
    onError: (error) => {
      toast.error(error.error?.message || 'Không thể tạo sequence')
    },
  })
}

export function useUpdateNumberSequence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => authApi.updateNumberSequence(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.numberSequences.all })
      toast.success('Cập nhật sequence thành công')
    },
    onError: (error) => {
      toast.error(error.error?.message || 'Không thể cập nhật sequence')
    },
  })
}
