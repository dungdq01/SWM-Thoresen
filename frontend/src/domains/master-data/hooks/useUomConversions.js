import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { uomConversionApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useUomConversionList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.uomConversions, filters],
    queryFn: () => uomConversionApi.getList(filters),
    staleTime: 30000,
  })
}

export function useUomConversionDetail(id) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.uomConversionDetail(id),
    queryFn: () => uomConversionApi.getById(id),
    enabled: !!id,
    staleTime: 30000,
  })
}

export function useCreateUomConversion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => uomConversionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.uomConversions })
      toast.success('Thêm quy đổi UOM thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useUpdateUomConversion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => uomConversionApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.uomConversions })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.uomConversionDetail(variables.id) })
      toast.success('Cập nhật quy đổi UOM thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useDeleteUomConversion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => uomConversionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.uomConversions })
      toast.success('Xóa quy đổi UOM thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}
