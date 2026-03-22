import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { itemIncompatibilityApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useItemIncompatibilityList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.itemIncompatibilities, filters],
    queryFn: () => itemIncompatibilityApi.getList(filters),
    staleTime: 30000,
  })
}

export function useItemIncompatibilityDetail(id) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.itemIncompatibilityDetail(id),
    queryFn: () => itemIncompatibilityApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateItemIncompatibility() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => itemIncompatibilityApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemIncompatibilities })
      toast.success('Tạo quy tắc không tương thích thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useUpdateItemIncompatibility() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => itemIncompatibilityApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemIncompatibilities })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemIncompatibilityDetail(id) })
      toast.success('Cập nhật quy tắc thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useDeactivateItemIncompatibility() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }) => itemIncompatibilityApi.deactivate(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemIncompatibilities })
      toast.success('Đã ngừng hoạt động quy tắc')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useReactivateItemIncompatibility() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => itemIncompatibilityApi.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemIncompatibilities })
      toast.success('Đã kích hoạt lại quy tắc')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}
