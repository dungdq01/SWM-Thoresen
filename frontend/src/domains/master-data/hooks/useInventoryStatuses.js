import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryStatusApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'

export function useInventoryStatusList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.inventoryStatuses, filters],
    queryFn: () => inventoryStatusApi.getList(filters),
    staleTime: 60000,
  })
}

export function useInventoryStatusDetail(id) {
  return useQuery({
    queryKey: ['master-data', 'inventory-statuses', id],
    queryFn: () => inventoryStatusApi.getById(id),
    enabled: !!id,
  })
}

export function useUpdateInventoryStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => inventoryStatusApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.inventoryStatuses })
      queryClient.invalidateQueries({ queryKey: ['master-data', 'inventory-statuses', id] })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupInventoryStatuses })
      toast.success('Cập nhật trạng thái tồn kho thành công')
    },
    onError: (error) => {
      if (error?.error?.statusCode === 409) {
        toast.error('Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.')
      } else {
        toast.error(error?.error?.message || 'Không thể cập nhật trạng thái tồn kho')
      }
    },
  })
}
