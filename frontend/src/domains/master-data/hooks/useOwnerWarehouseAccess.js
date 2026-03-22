import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ownerWarehouseAccessApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useOwnerWarehouseAccess(ownerId) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.ownerWarehouseAccess(ownerId),
    queryFn: () => ownerWarehouseAccessApi.getList(ownerId),
    enabled: !!ownerId,
  })
}

export function useCreateOwnerWarehouseAccess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ownerId, warehouseId }) => ownerWarehouseAccessApi.create(ownerId, { warehouseId }),
    onSuccess: (_, { ownerId }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.ownerWarehouseAccess(ownerId) })
      toast.success('Đã gán quyền truy cập kho')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useDeleteOwnerWarehouseAccess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ownerId, warehouseId }) => ownerWarehouseAccessApi.delete(ownerId, warehouseId),
    onSuccess: (_, { ownerId }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.ownerWarehouseAccess(ownerId) })
      toast.success('Đã xóa quyền truy cập kho')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}
