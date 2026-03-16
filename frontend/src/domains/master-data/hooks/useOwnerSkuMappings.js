import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ownerSkuMappingApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useOwnerSkuMappingList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.ownerSkuMappings, filters],
    queryFn: () => ownerSkuMappingApi.getList(filters),
    staleTime: 30000,
  })
}

export function useOwnerSkuMappingNextCode() {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.ownerSkuMappings, 'next-code'],
    queryFn: () => ownerSkuMappingApi.getNextCode(),
    staleTime: 0,
  })
}

export function useCreateOwnerSkuMapping() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => ownerSkuMappingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.ownerSkuMappings })
      toast.success('Tạo mapping Owner-SKU thành công')
    },
    onError: (error) => { toast.error(parseApiError(error)) },
  })
}

export function useUpdateOwnerSkuMapping() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => ownerSkuMappingApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.ownerSkuMappings })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.ownerSkuMappingDetail(id) })
      toast.success('Cập nhật mapping thành công')
    },
    onError: (error) => { toast.error(parseApiError(error)) },
  })
}

export function useDeleteOwnerSkuMapping() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => ownerSkuMappingApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.ownerSkuMappings })
      toast.success('Đã xóa mapping')
    },
    onError: (error) => { toast.error(parseApiError(error)) },
  })
}
