import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@shared/api/queryClient'
import { authApi } from '../api/auth.api'
import toast from 'react-hot-toast'

export function usePermissions(filters = {}) {
  return useQuery({
    queryKey: queryKeys.permissions.list(filters),
    queryFn: () => authApi.getPermissions(filters),
    select: (response) => response?.data ?? response ?? [],
  })
}

export function useCreatePermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => authApi.createPermission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all })
      toast.success('Tạo quyền mới thành công')
    },
    onError: (error) => {
      toast.error(error.error?.message || 'Không thể tạo quyền')
    },
  })
}

export function useUpdatePermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => authApi.updatePermission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all })
      toast.success('Cập nhật quyền thành công')
    },
    onError: (error) => {
      toast.error(error.error?.message || 'Không thể cập nhật quyền')
    },
  })
}

export function useDeletePermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => authApi.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all })
      toast.success('Đã xóa quyền')
    },
    onError: (error) => {
      toast.error(error.error?.message || 'Không thể xóa quyền')
    },
  })
}

export function useMyPermissions() {
  return useQuery({
    queryKey: queryKeys.auth.permissions,
    queryFn: () => authApi.getMyPermissions(),
    select: (response) => response?.data ?? response ?? {},
    staleTime: 10 * 60 * 1000,
  })
}
