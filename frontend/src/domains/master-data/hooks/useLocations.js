import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { locationApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'

export function useLocationList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.locations, filters],
    queryFn: () => locationApi.getList(filters),
    staleTime: 30000,
  })
}

export function useLocationDetail(id) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.locationDetail(id),
    queryFn: () => locationApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => locationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.locations })
      toast.success('Tạo vị trí thành công')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể tạo vị trí')
    },
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => locationApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.locations })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.locationDetail(id) })
      toast.success('Cập nhật vị trí thành công')
    },
    onError: (error) => {
      if (error?.error?.statusCode === 409) {
        toast.error('Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.')
      } else {
        toast.error(error?.error?.message || 'Không thể cập nhật vị trí')
      }
    },
  })
}

export function useDeactivateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }) => locationApi.deactivate(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.locations })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.locationDetail(id) })
      toast.success('Đã ngừng hoạt động vị trí')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể ngừng hoạt động vị trí')
    },
  })
}

export function useReactivateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => locationApi.reactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.locations })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.locationDetail(id) })
      toast.success('Đã kích hoạt lại vị trí')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể kích hoạt lại vị trí')
    },
  })
}
