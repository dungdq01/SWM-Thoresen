import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ownerApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useOwnerNextCode(enabled = false) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.owners, 'next-code'],
    queryFn: () => ownerApi.getNextCode(),
    enabled,
    staleTime: 0,
  })
}

export function useOwnerList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.owners, filters],
    queryFn: () => ownerApi.getList(filters),
    staleTime: 30000,
  })
}

export function useOwnerDetail(id) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.ownerDetail(id),
    queryFn: () => ownerApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateOwner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => ownerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.owners })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupOwners })
      toast.success('Tạo chủ hàng thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useUpdateOwner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => ownerApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.owners })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.ownerDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupOwners })
      toast.success('Cập nhật chủ hàng thành công')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useDeactivateOwner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }) => ownerApi.deactivate(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.owners })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.ownerDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupOwners })
      toast.success('Đã ngừng hoạt động chủ hàng')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useReactivateOwner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => ownerApi.reactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.owners })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.ownerDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupOwners })
      toast.success('Đã kích hoạt lại chủ hàng')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}
