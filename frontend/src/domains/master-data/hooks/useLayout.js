import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { layoutApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'
import { parseApiError } from '@shared/api/parseApiError'

export function useWarehouseLayout(warehouseId) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.warehouseLayout(warehouseId),
    queryFn: () => layoutApi.getWarehouseLayout(warehouseId),
    enabled: !!warehouseId,
  })
}

export function useSaveWarehouseLayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ warehouseId, data }) => layoutApi.saveWarehouseLayout(warehouseId, data),
    onSuccess: (_, { warehouseId }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.warehouseLayout(warehouseId) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.warehouseDetail(warehouseId) })
      toast.success('Đã lưu layout kho')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}

export function useSiteLayout(siteId) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.siteLayout(siteId),
    queryFn: () => layoutApi.getSiteLayout(siteId),
    enabled: !!siteId,
  })
}

export function useSaveSiteLayout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ siteId, data }) => layoutApi.saveSiteLayout(siteId, data),
    onSuccess: (_, { siteId }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.siteLayout(siteId) })
      toast.success('Đã lưu layout site')
    },
    onError: (error) => {
      toast.error(parseApiError(error))
    },
  })
}
