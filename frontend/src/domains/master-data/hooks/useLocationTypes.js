import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { locationTypeApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useLocationTypeNextCode(enabled = false) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.locationTypes, 'next-code'],
    queryFn: () => locationTypeApi.getNextCode(),
    enabled,
    staleTime: 0,
  })
}

export function useLocationTypeList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.locationTypes, filters],
    queryFn: () => locationTypeApi.getList(filters),
    staleTime: 60000,
  })
}

export function useCreateLocationType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => locationTypeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.locationTypes })
      toast.success('Tạo loại vị trí thành công')
    },
    onError: (error) => { toast.error(parseApiError(error)) },
  })
}

export function useUpdateLocationType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => locationTypeApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.locationTypes })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.locationTypeDetail(id) })
      toast.success('Cập nhật loại vị trí thành công')
    },
    onError: (error) => { toast.error(parseApiError(error)) },
  })
}

export function useDeleteLocationType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => locationTypeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.locationTypes })
      toast.success('Đã xóa loại vị trí')
    },
    onError: (error) => { toast.error(parseApiError(error)) },
  })
}
