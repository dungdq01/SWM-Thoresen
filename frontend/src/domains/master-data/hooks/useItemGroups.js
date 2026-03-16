import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { itemGroupApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useItemGroupNextCode(enabled = false) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.itemGroups, 'next-code'],
    queryFn: () => itemGroupApi.getNextCode(),
    enabled,
    staleTime: 0,
  })
}

export function useItemGroupList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.itemGroups, filters],
    queryFn: () => itemGroupApi.getList(filters),
    staleTime: 30000,
  })
}

export function useCreateItemGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => itemGroupApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemGroups })
      toast.success('Tạo nhóm hàng hóa thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useUpdateItemGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => itemGroupApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemGroups })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemGroupDetail(id) })
      toast.success('Cập nhật nhóm hàng hóa thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useDeactivateItemGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => itemGroupApi.deactivate(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemGroups })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemGroupDetail(id) })
      toast.success('Đã ngừng hoạt động nhóm hàng hóa')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useReactivateItemGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => itemGroupApi.reactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemGroups })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemGroupDetail(id) })
      toast.success('Đã kích hoạt lại nhóm hàng hóa')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}
