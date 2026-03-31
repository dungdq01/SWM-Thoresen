import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rackApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useRackList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.racks, filters],
    queryFn: () => rackApi.getList(filters),
    staleTime: 30000,
  })
}

export function useCreateRack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => rackApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.racks })
      toast.success('Tạo kệ hàng thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useUpdateRack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => rackApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.racks })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.rackDetail(id) })
      toast.success('Cập nhật kệ hàng thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}
