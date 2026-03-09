import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { uomApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'

export function useUomList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.uoms, filters],
    queryFn: () => uomApi.getList(filters),
    staleTime: 30000,
  })
}

export function useUomDetail(id) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.uomDetail(id),
    queryFn: () => uomApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateUom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => uomApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.uoms })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupUoms })
      toast.success('Tạo đơn vị tính thành công')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể tạo đơn vị tính')
    },
  })
}

export function useUpdateUom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => uomApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.uoms })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.uomDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupUoms })
      toast.success('Cập nhật đơn vị tính thành công')
    },
    onError: (error) => {
      if (error?.error?.statusCode === 409) {
        toast.error('Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.')
      } else {
        toast.error(error?.error?.message || 'Không thể cập nhật đơn vị tính')
      }
    },
  })
}

export function useDeactivateUom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }) => uomApi.deactivate(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.uoms })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.uomDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupUoms })
      toast.success('Đã ngừng hoạt động đơn vị tính')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể ngừng hoạt động đơn vị tính')
    },
  })
}

export function useReactivateUom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => uomApi.reactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.uoms })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.uomDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupUoms })
      toast.success('Đã kích hoạt lại đơn vị tính')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể kích hoạt lại đơn vị tính')
    },
  })
}
