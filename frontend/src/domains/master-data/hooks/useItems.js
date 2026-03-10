import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { itemApi } from '../api/masterData.api'
import { MASTER_DATA_QUERY_KEYS } from '../model/constants'
import toast from 'react-hot-toast'

export function useItemNextCode(enabled = false) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.items, 'next-code'],
    queryFn: () => itemApi.getNextCode(),
    enabled,
    staleTime: 0,
  })
}

export function useItemList(filters = {}) {
  return useQuery({
    queryKey: [...MASTER_DATA_QUERY_KEYS.items, filters],
    queryFn: () => itemApi.getList(filters),
    staleTime: 30000,
  })
}

export function useItemDetail(id) {
  return useQuery({
    queryKey: MASTER_DATA_QUERY_KEYS.itemDetail(id),
    queryFn: () => itemApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => itemApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.items })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupItems })
      toast.success('Tạo mặt hàng thành công')
    },
    onError: (error) => {
      if (error?.error?.statusCode === 409) {
        toast.error(error?.error?.message || 'Mã mặt hàng đã tồn tại. Vui lòng chọn mã khác.')
      } else {
        toast.error(error?.error?.message || 'Không thể tạo mặt hàng')
      }
    },
  })
}

export function useUpdateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => itemApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.items })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupItems })
      toast.success('Cập nhật mặt hàng thành công')
    },
    onError: (error) => {
      if (error?.error?.statusCode === 409) {
        toast.error('Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.')
      } else {
        toast.error(error?.error?.message || 'Không thể cập nhật mặt hàng')
      }
    },
  })
}

export function useDeactivateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }) => itemApi.deactivate(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.items })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupItems })
      toast.success('Đã ngừng hoạt động mặt hàng')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể ngừng hoạt động mặt hàng')
    },
  })
}

export function useReactivateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => itemApi.reactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.items })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.itemDetail(id) })
      queryClient.invalidateQueries({ queryKey: MASTER_DATA_QUERY_KEYS.lookupItems })
      toast.success('Đã kích hoạt lại mặt hàng')
    },
    onError: (error) => {
      toast.error(error?.error?.message || 'Không thể kích hoạt lại mặt hàng')
    },
  })
}
